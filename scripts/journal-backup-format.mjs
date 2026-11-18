import { createDecipheriv, scrypt } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, open } from "node:fs/promises";
import { createGunzip } from "node:zlib";
import { dirname, isAbsolute, normalize, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

export const BACKUP_MAGIC = Buffer.from("TBJBAK1\n", "ascii");
export const BACKUP_HEADER_SIZE = BACKUP_MAGIC.length + 16 + 12;
const AUTH_TAG_SIZE = 16;
const MAX_LINE_SIZE = 1024 * 1024;
const MAX_BACKUP_CONTENT_SIZE = 1024 ** 4;
const scryptAsync = promisify(scrypt);

export function backupPassphrase() {
  const value = process.env.JOURNAL_BACKUP_PASSPHRASE ?? "";
  if (value.length < 20) {
    throw new Error(
      "Set JOURNAL_BACKUP_PASSPHRASE to a unique passphrase of at least 20 characters.",
    );
  }
  return value;
}

export async function deriveBackupKey(passphrase, salt) {
  return await scryptAsync(passphrase, salt, 32, {
    N: 1 << 17,
    r: 8,
    p: 1,
    maxmem: 256 * 1024 * 1024,
  });
}

export function isInside(parent, candidate) {
  const rel = relative(resolve(parent), resolve(candidate));
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

export async function openBackupPayload(filename, passphrase) {
  const file = await open(filename, "r");
  try {
    const stats = await file.stat();
    if (stats.size < BACKUP_HEADER_SIZE + AUTH_TAG_SIZE)
      throw new Error("Backup file is truncated or invalid.");
    const header = Buffer.alloc(BACKUP_HEADER_SIZE);
    const { bytesRead } = await file.read(header, 0, header.length, 0);
    if (
      bytesRead !== header.length ||
      !header.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC)
    )
      throw new Error("This is not a Trading Bauhaus encrypted backup.");
    const tag = Buffer.alloc(AUTH_TAG_SIZE);
    const tagRead = await file.read(tag, 0, tag.length, stats.size - AUTH_TAG_SIZE);
    if (tagRead.bytesRead !== tag.length) throw new Error("Backup authentication data is missing.");
    const saltStart = BACKUP_MAGIC.length;
    const ivStart = saltStart + 16;
    const salt = header.subarray(saltStart, ivStart);
    const iv = header.subarray(ivStart);
    const key = await deriveBackupKey(passphrase, salt);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const ciphertext = createReadStream(filename, {
      start: BACKUP_HEADER_SIZE,
      end: stats.size - AUTH_TAG_SIZE - 1,
    });
    return ciphertext.pipe(decipher).pipe(createGunzip());
  } finally {
    await file.close();
  }
}

function safeArchivePath(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    value.startsWith("/") ||
    value.split("/").some((part) => !part || part === "." || part === "..") ||
    normalize(value) !== value
  )
    throw new Error("Backup contains an unsafe file path.");
  return value;
}

export async function restorePayload(payload, target) {
  const iterator = payload[Symbol.asyncIterator]();
  let buffer = Buffer.alloc(0);
  let sourceEnded = false;
  const pull = async (minimum) => {
    while (buffer.length < minimum && !sourceEnded) {
      const next = await iterator.next();
      if (next.done) sourceEnded = true;
      else buffer = buffer.length ? Buffer.concat([buffer, next.value]) : Buffer.from(next.value);
    }
    return buffer.length >= minimum;
  };
  const readLine = async () => {
    let newline = buffer.indexOf(10);
    while (newline < 0 && !sourceEnded) {
      if (buffer.length > MAX_LINE_SIZE) throw new Error("Backup metadata line is too long.");
      const next = await iterator.next();
      if (next.done) sourceEnded = true;
      else buffer = buffer.length ? Buffer.concat([buffer, next.value]) : Buffer.from(next.value);
      newline = buffer.indexOf(10);
    }
    if (newline < 0 || newline > MAX_LINE_SIZE) throw new Error("Backup metadata is incomplete.");
    const line = buffer.subarray(0, newline).toString("utf8");
    buffer = buffer.subarray(newline + 1);
    return line;
  };
  const readExact = async (size, destination) => {
    let remaining = size;
    const parts = [];
    while (remaining > 0) {
      if (!buffer.length && !(await pull(1))) throw new Error("Backup file content is truncated.");
      const count = Math.min(remaining, buffer.length);
      if (destination) {
        let offset = 0;
        while (offset < count) {
          const result = await destination.write(buffer, offset, count - offset);
          if (!result.bytesWritten) throw new Error("Could not write restored backup data.");
          offset += result.bytesWritten;
        }
      } else parts.push(buffer.subarray(0, count));
      buffer = buffer.subarray(count);
      remaining -= count;
    }
    return destination ? undefined : Buffer.concat(parts);
  };

  const manifest = JSON.parse(await readLine());
  if (
    manifest?.format !== "trading-bauhaus-backup-v1" ||
    typeof manifest.createdAt !== "string" ||
    !Number.isSafeInteger(manifest.fileCount) ||
    typeof manifest.hasEnvironmentJournalSecret !== "boolean"
  )
    throw new Error("Backup manifest is not supported.");
  const seen = new Set();
  let totalBytes = 0;
  let fileCount = 0;
  while (true) {
    const record = JSON.parse(await readLine());
    if (record?.end === true) break;
    const archivePath = safeArchivePath(record?.path);
    if (!Number.isSafeInteger(record?.size) || record.size < 0)
      throw new Error("Backup contains an invalid file size.");
    if (seen.has(archivePath)) throw new Error("Backup contains a duplicate file path.");
    seen.add(archivePath);
    totalBytes += record.size;
    if (!Number.isSafeInteger(totalBytes) || totalBytes > MAX_BACKUP_CONTENT_SIZE)
      throw new Error("Backup exceeds the supported restore size.");

    const output = resolve(target, archivePath);
    if (!isInside(target, output) || output === resolve(target))
      throw new Error("Backup contains an unsafe file path.");
    await mkdir(dirname(output), { recursive: true, mode: 0o700 });
    const destination = await open(output, "wx", 0o600);
    try {
      await readExact(record.size, destination);
      await destination.sync();
    } finally {
      await destination.close();
    }
    const separator = await readExact(1);
    if (separator[0] !== 10) throw new Error("Backup file separator is invalid.");
    fileCount++;
  }
  if (buffer.length || (await iterator.next()).done !== true)
    throw new Error("Backup has unexpected trailing data.");
  if (fileCount !== manifest.fileCount)
    throw new Error("Backup file count does not match its manifest.");
  return { manifest, fileCount, totalBytes };
}
