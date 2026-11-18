#!/usr/bin/env node
import { createRequire } from "node:module";
import { chmod, lstat, mkdir, mkdtemp, readdir, rename, rm, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  backupPassphrase,
  isInside,
  openBackupPayload,
  restorePayload,
} from "./journal-backup-format.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(repoRoot, "apps/web/package.json"));
const Database = require("better-sqlite3");
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error(
    "Usage: JOURNAL_BACKUP_PASSPHRASE='same 20+ character passphrase' node scripts/restore-journal.mjs <encrypted-backup-file> <new-data-directory>",
  );
  process.exit(2);
}

const backupFile = resolve(args[0]);
const targetDir = resolve(args[1]);
const passphrase = backupPassphrase();
const sourceDir = resolve(process.env.JOURNAL_DATA_DIR ?? join(repoRoot, "apps/web/data"));
if (targetDir === sourceDir || isInside(sourceDir, targetDir))
  throw new Error("Restore to a new data directory outside the current JOURNAL_DATA_DIR.");
if (await lstat(targetDir).catch(() => null))
  throw new Error(
    "Restore destination already exists. Choose a new, empty path; this command never overwrites data.",
  );
if (!(await stat(backupFile).catch(() => null))?.isFile())
  throw new Error("Encrypted backup file was not found.");
await mkdir(dirname(targetDir), { recursive: true, mode: 0o700 });
const temporaryTarget = await mkdtemp(
  join(dirname(targetDir), `.${targetDir.split(/[\\/]/).pop()}-restore-`),
);
await chmod(temporaryTarget, 0o700);
let promoted = false;
let reservedTarget = false;

try {
  const payload = await openBackupPayload(backupFile, passphrase);
  const restored = await restorePayload(payload, temporaryTarget);
  if (
    !restored.fileCount ||
    !(await stat(join(temporaryTarget, "journal.db")).catch(() => null))?.isFile()
  )
    throw new Error("Restored backup does not contain the owner database.");

  const databases = [];
  async function findDatabases(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) await findDatabases(path);
      else if (entry.isFile() && entry.name.endsWith(".db")) databases.push(path);
    }
  }
  await findDatabases(temporaryTarget);
  for (const path of databases) {
    const db = new Database(path, { readonly: true, fileMustExist: true });
    try {
      const integrity = db.pragma("quick_check");
      if (integrity.length !== 1 || integrity[0]?.quick_check !== "ok")
        throw new Error(
          `Restored SQLite database did not pass quick_check: ${path.slice(temporaryTarget.length + 1)}`,
        );
    } finally {
      db.close();
    }
  }

  // mkdir is the atomic no-clobber reservation. A prior lstat alone leaves a
  // race where POSIX rename could replace an empty destination directory.
  try {
    await mkdir(targetDir, { mode: 0o700 });
    reservedTarget = true;
  } catch (error) {
    if (error?.code === "EEXIST")
      throw new Error("Restore destination appeared while restoring; it was preserved.");
    throw error;
  }
  for (const entry of await readdir(temporaryTarget))
    await rename(join(temporaryTarget, entry), join(targetDir, entry));
  promoted = true;
  await rm(temporaryTarget, { recursive: true, force: true });
  console.log(`Restore completed and verified: ${targetDir}`);
  console.log(
    `SQLite databases checked: ${databases.length}; files restored: ${restored.fileCount}`,
  );
  if (restored.manifest.hasEnvironmentJournalSecret)
    console.log(
      "Configure the original JOURNAL_SECRET from your separate secrets manager before starting the hosted app.",
    );
  else console.log("The backup includes the data-directory .secret file if one existed.");
  console.log(
    "The original owner login password, proxy token, and public origin must be configured separately.",
  );
} finally {
  if (reservedTarget && !promoted) await rm(targetDir, { recursive: true, force: true });
  if (!promoted) await rm(temporaryTarget, { recursive: true, force: true });
}
