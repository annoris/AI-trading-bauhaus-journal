#!/usr/bin/env node
import { randomBytes, createCipheriv } from "node:crypto";
import { createRequire } from "node:module";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import {
  appendFile,
  chmod,
  copyFile,
  link,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readdir,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import {
  BACKUP_MAGIC,
  backupPassphrase,
  deriveBackupKey,
  isInside,
} from "./journal-backup-format.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(repoRoot, "apps/web/package.json"));
const Database = require("better-sqlite3");

function usage() {
  console.error(
    "Usage: JOURNAL_BACKUP_PASSPHRASE='unique 20+ character passphrase' node scripts/backup-journal.mjs --confirm-app-stopped <new-encrypted-backup-file>",
  );
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--confirm-app-stopped") usage();
const sourceDir = resolve(process.env.JOURNAL_DATA_DIR ?? join(repoRoot, "apps/web/data"));
const outputFile = resolve(args[1]);
const passphrase = backupPassphrase();

if (outputFile === sourceDir || isInside(sourceDir, outputFile))
  throw new Error("Store the encrypted backup outside JOURNAL_DATA_DIR.");
const sourceStats = await stat(sourceDir).catch(() => null);
if (!sourceStats?.isDirectory())
  throw new Error(`Journal data directory does not exist: ${sourceDir}`);
if (!(await stat(join(sourceDir, "journal.db")).catch(() => null))?.isFile())
  throw new Error("The owner database journal.db was not found in JOURNAL_DATA_DIR.");
if (await lstat(outputFile).catch(() => null))
  throw new Error("Backup destination already exists; choose a new filename.");

await mkdir(dirname(outputFile), { recursive: true, mode: 0o700 });
let lock;
try {
  lock = await open(join(sourceDir, ".runtime-backup.lock"), "wx", 0o600);
} catch (error) {
  if (error?.code === "EEXIST")
    throw new Error(
      "A backup lock already exists. Confirm no backup is running before removing JOURNAL_DATA_DIR/.runtime-backup.lock.",
    );
  throw error;
}
let tempDir;
const partialFile = join(
  dirname(outputFile),
  `.runtime-backup-${process.pid}-${randomBytes(6).toString("hex")}.partial`,
);
const files = [];

async function snapshotTree(source, target, prefix = "") {
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const sourcePath = join(source, entry.name);
    const archivePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const sidecarSuffix = ["-wal", "-shm", "-journal"].find((suffix) =>
      entry.name.endsWith(suffix),
    );
    if (
      sidecarSuffix &&
      entry.name.slice(0, -sidecarSuffix.length).endsWith(".db") &&
      existsSync(sourcePath.slice(0, -sidecarSuffix.length))
    )
      continue;
    if (!prefix && entry.name.startsWith(".runtime-backup-snapshot-")) continue;
    if (!prefix && entry.name === ".runtime-backup.lock") continue;
    const destination = join(target, entry.name);
    const info = await lstat(sourcePath);
    if (info.isSymbolicLink()) throw new Error(`Refusing symlink in journal data: ${archivePath}`);
    if (info.isDirectory()) {
      await mkdir(destination, { recursive: true, mode: 0o700 });
      await snapshotTree(sourcePath, destination, archivePath);
      continue;
    }
    if (!info.isFile()) throw new Error(`Unsupported file type in journal data: ${archivePath}`);
    if (extname(entry.name).toLowerCase() === ".db") {
      const sourceDb = new Database(sourcePath, { readonly: true, fileMustExist: true });
      try {
        const integrity = sourceDb.pragma("quick_check");
        if (integrity.length !== 1 || integrity[0]?.quick_check !== "ok")
          throw new Error(`SQLite integrity check failed: ${archivePath}`);
        await sourceDb.backup(destination);
      } finally {
        sourceDb.close();
      }
    } else {
      await copyFile(sourcePath, destination);
      await chmod(destination, 0o600);
    }
    const saved = await stat(destination);
    files.push({ path: archivePath, absolute: destination, size: saved.size });
  }
}

try {
  // Clear snapshots left by a crashed, formerly lock-free run. The exclusive
  // lock above means no other supported backup process owns those directories.
  for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
    if (
      entry.name.startsWith(".runtime-backup-snapshot-") &&
      entry.isDirectory() &&
      !entry.isSymbolicLink()
    )
      await rm(join(sourceDir, entry.name), { recursive: true, force: true });
  }
  // Plaintext SQLite snapshots stay on the local data volume, not in the
  // destination that may be synchronized/off-host. Keep this volume encrypted.
  tempDir = await mkdtemp(join(sourceDir, ".runtime-backup-snapshot-"));
  await chmod(tempDir, 0o700);
  await snapshotTree(sourceDir, tempDir);
  if (!files.some((file) => file.path === "journal.db"))
    throw new Error("Backup snapshot is missing the owner database.");

  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveBackupKey(passphrase, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const manifest = {
    format: "trading-bauhaus-backup-v1",
    createdAt: new Date().toISOString(),
    fileCount: files.length,
    hasEnvironmentJournalSecret: Boolean(process.env.JOURNAL_SECRET),
  };
  await writeFile(partialFile, Buffer.concat([BACKUP_MAGIC, salt, iv]), {
    flag: "wx",
    mode: 0o600,
  });

  async function* archiveRecords() {
    yield Buffer.from(`${JSON.stringify(manifest)}\n`);
    for (const file of files) {
      yield Buffer.from(`${JSON.stringify({ path: file.path, size: file.size })}\n`);
      for await (const chunk of createReadStream(file.absolute)) yield chunk;
      yield Buffer.from("\n");
    }
    yield Buffer.from('{"end":true}\n');
  }

  await pipeline(
    Readable.from(archiveRecords()),
    createGzip({ level: 9 }),
    cipher,
    createWriteStream(partialFile, { flags: "a", mode: 0o600 }),
  );
  await appendFile(partialFile, cipher.getAuthTag());
  await chmod(partialFile, 0o600);
  await link(partialFile, outputFile);
  await unlink(partialFile);

  const bytes = (await stat(outputFile)).size;
  const relativeSource = relative(repoRoot, sourceDir);
  const displaySource =
    relativeSource && !relativeSource.startsWith("..") ? relativeSource : sourceDir;
  console.log(`Encrypted backup created: ${outputFile}`);
  const archiveSize =
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KiB`
      : `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
  console.log(`Files: ${files.length}; archive: ${archiveSize}; source: ${displaySource}`);
  console.log("The same passphrase is required to restore this archive.");
  if (process.env.JOURNAL_SECRET)
    console.log(
      "Keep JOURNAL_SECRET in your separate secrets manager; this backup does not contain environment secrets.",
    );
} finally {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
  await rm(partialFile, { force: true });
  await lock?.close();
  await unlink(join(sourceDir, ".runtime-backup.lock")).catch(() => undefined);
}
