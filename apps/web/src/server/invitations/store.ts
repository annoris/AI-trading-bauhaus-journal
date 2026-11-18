import { createHash, randomBytes } from "node:crypto";
import type Database from "better-sqlite3";

export const INVITATION_SCHEMA = `
CREATE TABLE IF NOT EXISTS signup_invitations (
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, email TEXT NOT NULL,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
 consumed_at INTEGER, revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS signup_invitation_created ON signup_invitations(created_at);
CREATE TABLE IF NOT EXISTS invitation_attempt_window (
 id INTEGER PRIMARY KEY CHECK (id = 1), starts_at INTEGER NOT NULL, attempts INTEGER NOT NULL
);`;

export class InvitationError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
export function normalizeInvitationEmail(input: unknown): string {
  if (typeof input !== "string" || input.length > 254)
    throw new InvitationError(400, "Enter a valid email address.");
  const email = input.trim().toLowerCase();
  if (
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
      email,
    ) ||
    email.split("@")[0]!.length > 64
  )
    throw new InvitationError(400, "Enter a valid email address.");
  return email;
}
type Row = {
  id: string;
  email: string;
  expires_at: number;
  consumed_at: number | null;
  revoked_at: number | null;
};

/**
 * Invitation storage used by owner-only issuance and the public validation/redemption
 * handlers. Redemption currently treats the random link as a bearer credential: the
 * supplied email is compared with the invitation record, but mailbox ownership is not
 * verified. The redemption callback must synchronously create the account and session
 * metadata so those writes commit or roll back with consumption of the invitation.
 */
export function createInvitationStore(sqlite: Database.Database, clock = Date.now) {
  sqlite.exec(INVITATION_SCHEMA);
  const create = (emailInput: unknown, ttlHours = 168) => {
    const email = normalizeInvitationEmail(emailInput);
    if (!Number.isInteger(ttlHours) || ttlHours < 1 || ttlHours > 168)
      throw new InvitationError(400, "Invitation validity must be 1–168 hours.");
    return sqlite
      .transaction(() => {
        const now = clock();
        const count = (from: number) =>
          (
            sqlite
              .prepare("SELECT count(*) n FROM signup_invitations WHERE created_at >= ?")
              .get(from) as { n: number }
          ).n;
        if (count(now - 3600000) >= 10 || count(now - 86400000) >= 50)
          throw new InvitationError(429, "Invitation limit reached. Try again later.");
        const outstanding = (
          sqlite
            .prepare(
              "SELECT count(*) n FROM signup_invitations WHERE consumed_at IS NULL AND revoked_at IS NULL AND expires_at > ?",
            )
            .get(now) as { n: number }
        ).n;
        if (outstanding >= 50) throw new InvitationError(429, "Too many pending invitations.");
        if (
          sqlite
            .prepare(
              "SELECT id FROM signup_invitations WHERE email = ? AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at > ?",
            )
            .get(email, now)
        )
          throw new InvitationError(409, "This email already has a pending invitation.");
        const id = randomBytes(16).toString("hex");
        const token = "bh_" + randomBytes(32).toString("base64url");
        const expiresAt = now + ttlHours * 3600000;
        sqlite
          .prepare(
            "INSERT INTO signup_invitations (id,token_hash,email,created_at,expires_at) VALUES (?,?,?,?,?)",
          )
          .run(id, hash(token), email, now, expiresAt);
        return { id, token, email, expiresAt };
      })
      .immediate();
  };
  const list = () =>
    sqlite
      .prepare(
        "SELECT id,email,created_at AS createdAt,expires_at AS expiresAt,consumed_at AS consumedAt,revoked_at AS revokedAt FROM signup_invitations ORDER BY created_at DESC LIMIT 100",
      )
      .all();
  const validate = (token: unknown) => {
    if (typeof token !== "string" || !/^bh_[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const row = sqlite
      .prepare(
        "SELECT email,expires_at AS expiresAt,consumed_at AS consumedAt,revoked_at AS revokedAt FROM signup_invitations WHERE token_hash = ?",
      )
      .get(hash(token)) as
      | { email: string; expiresAt: number; consumedAt: number | null; revokedAt: number | null }
      | undefined;
    if (!row || row.consumedAt !== null || row.revokedAt !== null || row.expiresAt <= clock())
      return null;
    return { email: row.email, expiresAt: row.expiresAt };
  };
  const revoke = (id: string) => {
    if (!/^[a-f0-9]{32}$/.test(id)) throw new InvitationError(400, "Invalid invitation.");
    return (
      sqlite
        .prepare(
          "UPDATE signup_invitations SET revoked_at = ? WHERE id = ? AND consumed_at IS NULL AND revoked_at IS NULL",
        )
        .run(clock(), id).changes === 1
    );
  };
  const consume = <T>(token: string, invitationEmail: string, createUser: () => T): T => {
    const now = clock();
    // Persist invalid attempts too; fixed one-row bucket cannot grow with random input.
    const allowed = sqlite
      .transaction(() => {
        sqlite
          .prepare(
            "INSERT INTO invitation_attempt_window (id,starts_at,attempts) VALUES (1,?,0) ON CONFLICT(id) DO NOTHING",
          )
          .run(now);
        sqlite
          .prepare(
            "UPDATE invitation_attempt_window SET starts_at = ?,attempts = 0 WHERE id = 1 AND starts_at <= ?",
          )
          .run(now, now - 300000);
        const count = (
          sqlite.prepare("SELECT attempts FROM invitation_attempt_window WHERE id = 1").get() as {
            attempts: number;
          }
        ).attempts;
        if (count >= 100) return false;
        sqlite
          .prepare("UPDATE invitation_attempt_window SET attempts = attempts + 1 WHERE id = 1")
          .run();
        return true;
      })
      .immediate();
    if (!allowed) throw new InvitationError(429, "Try again later.");
    const invalid = () => new InvitationError(400, "Invitation is invalid or unavailable.");
    if (typeof token !== "string" || !/^bh_[A-Za-z0-9_-]{43}$/.test(token)) throw invalid();
    let email: string;
    try {
      email = normalizeInvitationEmail(invitationEmail);
    } catch {
      throw invalid();
    }
    return sqlite
      .transaction(() => {
        const row = sqlite
          .prepare(
            "SELECT id,email,expires_at,consumed_at,revoked_at FROM signup_invitations WHERE token_hash = ?",
          )
          .get(hash(token)) as Row | undefined;
        if (
          !row ||
          row.email !== email ||
          row.expires_at <= clock() ||
          row.consumed_at !== null ||
          row.revoked_at !== null
        )
          throw invalid();
        const changed = sqlite
          .prepare(
            "UPDATE signup_invitations SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at > ?",
          )
          .run(clock(), row.id, clock()).changes;
        if (changed !== 1) throw invalid();
        const result = createUser();
        if (result && typeof (result as { then?: unknown }).then === "function")
          throw new Error("Signup must use a synchronous database transaction.");
        return result;
      })
      .immediate();
  };
  return { create, list, revoke, consume, validate };
}
