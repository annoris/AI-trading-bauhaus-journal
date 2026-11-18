#!/usr/bin/env node
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(repoRoot, "apps/web/package.json"));
const Database = require("better-sqlite3");
const root = await mkdtemp(join(tmpdir(), "trading-bauhaus-backup-verify-"));
await chmod(root, 0o700);
const source = join(root, "source-data");
const backup = join(root, "whole-installation.tbjbackup");
const restored = join(root, "restored-data");
const wrongPassphraseTarget = join(root, "wrong-passphrase-data");
const tamperedBackup = join(root, "tampered.tbjbackup");
const tamperedTarget = join(root, "tampered-data");
const overwriteTarget = join(root, "existing-target");
const testPassphrase = "verification-only-passphrase-never-reuse-2026";
const env = {
  ...process.env,
  JOURNAL_DATA_DIR: source,
  JOURNAL_BACKUP_PASSPHRASE: testPassphrase,
};

function database(path, label, payload) {
  const db = new Database(path);
  db.exec("CREATE TABLE fixture (label TEXT NOT NULL, payload BLOB NOT NULL)");
  db.prepare("INSERT INTO fixture (label,payload) VALUES (?,?)").run(label, Buffer.from(payload));
  db.close();
}

function run(script, args, overrides = {}) {
  return spawnSync(process.execPath, [join(repoRoot, "scripts", script), ...args], {
    cwd: repoRoot,
    env: { ...env, ...overrides },
    encoding: "utf8",
    timeout: 120000,
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const userId = "0123456789abcdef0123456789abcdef";
  const memberFolder = join(source, "users", userId);
  const demoFolder = join(source, "public-demo");
  await mkdir(memberFolder, { recursive: true });
  await mkdir(demoFolder, { recursive: true });
  database(join(source, "journal.db"), "owner", "owner-attachment-binary");
  database(join(memberFolder, "journal.db"), "member", "member-attachment-binary");
  database(join(demoFolder, "journal.db"), "fictional-demo", "demo-attachment-binary");
  const fallbackSecret = "ab".repeat(32);
  await writeFile(join(source, ".secret"), fallbackSecret, { mode: 0o600 });
  await writeFile(join(source, "market-dataset.csv"), "time,open\n2026-01-01,100\n", {
    mode: 0o600,
  });

  const created = run("backup-journal.mjs", ["--confirm-app-stopped", backup]);
  assert(
    created.status === 0,
    `Encrypted backup creation failed:\n${created.stdout}\n${created.stderr}`,
  );
  assert((await stat(backup)).size > 60, "Encrypted backup is unexpectedly small.");

  const restoredResult = run("restore-journal.mjs", [backup, restored]);
  assert(
    restoredResult.status === 0,
    `Restore failed:\n${restoredResult.stdout}\n${restoredResult.stderr}`,
  );
  for (const [path, label, payload] of [
    [join(restored, "journal.db"), "owner", "owner-attachment-binary"],
    [join(restored, "users", userId, "journal.db"), "member", "member-attachment-binary"],
    [join(restored, "public-demo", "journal.db"), "fictional-demo", "demo-attachment-binary"],
  ]) {
    const db = new Database(path, { readonly: true, fileMustExist: true });
    try {
      const result = db.pragma("quick_check");
      assert(
        result.length === 1 && result[0]?.quick_check === "ok",
        `SQLite quick_check failed for ${path}`,
      );
      const row = db.prepare("SELECT label,payload FROM fixture").get();
      assert(
        row.label === label && row.payload.toString() === payload,
        `Restored binary data mismatch for ${label}`,
      );
    } finally {
      db.close();
    }
  }
  assert(
    (await readFile(join(restored, ".secret"), "utf8")) === fallbackSecret,
    "Fallback encryption key was not restored.",
  );
  assert(
    (await readFile(join(restored, "market-dataset.csv"), "utf8")).includes("2026-01-01"),
    "Regular data file was not restored.",
  );
  if (process.platform !== "win32") {
    const directoryMode = (await stat(restored, { bigint: true })).mode & 0o777n;
    const databaseMode = (await stat(join(restored, "journal.db"), { bigint: true })).mode & 0o777n;
    assert(
      directoryMode === 0o700n,
      `Restore directory permissions are too broad: ${directoryMode.toString(8)}`,
    );
    assert(
      databaseMode === 0o600n,
      `Restored database permissions are too broad: ${databaseMode.toString(8)}`,
    );
  }

  const wrongPassphrase = run("restore-journal.mjs", [backup, wrongPassphraseTarget], {
    JOURNAL_BACKUP_PASSPHRASE: "this-is-a-different-incorrect-passphrase",
  });
  assert(wrongPassphrase.status !== 0, "Wrong passphrase was accepted.");
  assert(
    !(await lstat(wrongPassphraseTarget).catch(() => null)),
    "Failed restore left a target directory.",
  );

  await copyFile(backup, tamperedBackup);
  const tamperedBytes = await readFile(tamperedBackup);
  tamperedBytes[tamperedBytes.length - 1] ^= 0xff;
  await writeFile(tamperedBackup, tamperedBytes, { mode: 0o600 });
  const tampered = run("restore-journal.mjs", [tamperedBackup, tamperedTarget]);
  assert(tampered.status !== 0, "Tampered archive passed authenticated decryption.");
  assert(
    !(await lstat(tamperedTarget).catch(() => null)),
    "Tampered restore left a target directory.",
  );

  await mkdir(overwriteTarget);
  const existing = run("restore-journal.mjs", [backup, overwriteTarget]);
  assert(existing.status !== 0, "Restore overwrote an existing directory.");
  assert((await stat(overwriteTarget)).isDirectory(), "Existing restore target was removed.");

  const insideSource = run("backup-journal.mjs", [
    "--confirm-app-stopped",
    join(source, "nested.tbjbackup"),
  ]);
  assert(
    insideSource.status !== 0,
    "Backup was allowed to write inside the source data directory.",
  );

  console.log(
    "Backup verification passed: encrypted archive; owner, member, demo, attachment BLOBs, .secret and regular files; SQLite integrity; private restore permissions; wrong-passphrase and tamper rejection; no overwrite; source/destination separation; failed-restore cleanup.",
  );
} finally {
  await rm(root, { recursive: true, force: true });
}
