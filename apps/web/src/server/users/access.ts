import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type Database from "better-sqlite3";
import { normalizeInvitationEmail } from "../invitations/store";

export class AccessError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
const derivePassword = (password: string, salt: Buffer) =>
  scryptSync(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
type User = {
  id: string;
  email: string;
  status: "active" | "suspended";
  role: "owner" | "user";
};
type UserRow = User & { password_salt: string | null; password_hash: string | null };

export const ACCESS_SCHEMA = `
CREATE TABLE IF NOT EXISTS application_users (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE,
 status TEXT NOT NULL CHECK(status IN ('active','suspended')),
 role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('owner','user')),
 password_salt TEXT, password_hash TEXT,
 created_at INTEGER NOT NULL, suspended_at INTEGER
);
CREATE TABLE IF NOT EXISTS user_access_sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES application_users(id),
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS user_access_session_owner ON user_access_sessions(user_id);
CREATE TABLE IF NOT EXISTS user_access_audit (
 id TEXT PRIMARY KEY, actor TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES application_users(id),
 action TEXT NOT NULL, occurred_at INTEGER NOT NULL
);`;

/**
 * Invited users get their own journal database. This store stays in the legacy
 * owner database and contains identity/session metadata only.
 */
export function createUserAccessStore(sqlite: Database.Database, clock = Date.now) {
  sqlite.exec(ACCESS_SCHEMA);
  const columns = new Set(
    (sqlite.pragma("table_info(application_users)") as { name: string }[]).map(
      (column) => column.name,
    ),
  );
  if (!columns.has("role"))
    sqlite.exec("ALTER TABLE application_users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
  if (!columns.has("password_salt"))
    sqlite.exec("ALTER TABLE application_users ADD COLUMN password_salt TEXT");
  if (!columns.has("password_hash"))
    sqlite.exec("ALTER TABLE application_users ADD COLUMN password_hash TEXT");

  const find = (id: string) =>
    sqlite.prepare("SELECT id,email,status,role FROM application_users WHERE id = ?").get(id) as
      User | undefined;
  const provisionVerifiedUser = (verifiedEmail: string) => {
    const email = normalizeInvitationEmail(verifiedEmail),
      id = randomBytes(16).toString("hex");
    sqlite
      .prepare(
        "INSERT INTO application_users (id,email,status,role,created_at) VALUES (?,?,'active','user',?)",
      )
      .run(id, email, clock());
    return { id, email, status: "active" as const };
  };
  const provisionInvitedUser = (emailInput: string, password: string) => {
    const email = normalizeInvitationEmail(emailInput);
    if (typeof password !== "string" || password.length < 12 || password.length > 1024)
      throw new AccessError(400, "Use a password with at least 12 characters.");
    const id = randomBytes(16).toString("hex");
    const salt = randomBytes(16);
    const hash = derivePassword(password, salt);
    sqlite
      .prepare(
        `INSERT INTO application_users
         (id,email,status,role,password_salt,password_hash,created_at)
         VALUES (?,?,'active','user',?,?,?)`,
      )
      .run(id, email, salt.toString("hex"), hash.toString("hex"), clock());
    return { id, email, status: "active" as const, role: "user" as const };
  };
  const list = () =>
    sqlite
      .prepare(
        `SELECT u.id,u.email,u.status,u.role,u.created_at AS createdAt,u.suspended_at AS suspendedAt,
    (SELECT count(*) FROM user_access_sessions s WHERE s.user_id = u.id AND s.revoked_at IS NULL AND s.expires_at > ?) AS activeSessions
    FROM application_users u ORDER BY u.created_at DESC,u.id LIMIT 100`,
      )
      .all(clock());
  const manage = (
    id: string,
    action: "suspend" | "reactivate" | "revoke-sessions",
    actor: string,
  ) => {
    if (
      !/^[a-f0-9]{32}$/.test(id) ||
      !["suspend", "reactivate", "revoke-sessions"].includes(action) ||
      !actor
    )
      throw new AccessError(400, "Invalid access request.");
    return sqlite
      .transaction(() => {
        const user = find(id);
        if (!user) throw new AccessError(404, "User not found.");
        if (user.role === "owner")
          throw new AccessError(403, "Owner access cannot be changed here.");
        const now = clock();
        if (action === "suspend")
          sqlite
            .prepare(
              "UPDATE application_users SET status = 'suspended',suspended_at = ? WHERE id = ?",
            )
            .run(now, id);
        if (action === "reactivate")
          sqlite
            .prepare(
              "UPDATE application_users SET status = 'active',suspended_at = NULL WHERE id = ?",
            )
            .run(id);
        const revoked =
          action === "reactivate"
            ? 0
            : sqlite
                .prepare(
                  "UPDATE user_access_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
                )
                .run(now, id).changes;
        sqlite
          .prepare(
            "INSERT INTO user_access_audit (id,actor,user_id,action,occurred_at) VALUES (?,?,?,?,?)",
          )
          .run(randomBytes(16).toString("hex"), actor, user.id, action, now);
        return { user: find(id)!, revokedSessions: revoked };
      })
      .immediate();
  };
  const authenticateCredentials = (emailInput: string, password: string): User | null => {
    let email: string;
    try {
      email = normalizeInvitationEmail(emailInput);
    } catch {
      email = "";
    }
    const row = sqlite
      .prepare(
        "SELECT id,email,status,role,password_salt,password_hash FROM application_users WHERE email = ?",
      )
      .get(email) as UserRow | undefined;
    const salt = row?.password_salt ? Buffer.from(row.password_salt, "hex") : randomBytes(16);
    const actual = derivePassword(typeof password === "string" ? password : "", salt);
    const expected = row?.password_hash ? Buffer.from(row.password_hash, "hex") : Buffer.alloc(64);
    if (
      !row ||
      row.status !== "active" ||
      !row.password_hash ||
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    )
      return null;
    return { id: row.id, email: row.email, status: row.status, role: row.role };
  };
  const issueSession = (userId: string) =>
    sqlite
      .transaction(() => {
        const user = find(userId);
        if (!user || user.status !== "active") throw new AccessError(403, "Access unavailable.");
        const active = (
          sqlite
            .prepare(
              "SELECT count(*) n FROM user_access_sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?",
            )
            .get(userId, clock()) as { n: number }
        ).n;
        if (active >= 5) throw new AccessError(429, "Session limit reached.");
        const token = "us_" + randomBytes(32).toString("base64url"),
          now = clock();
        sqlite
          .prepare(
            "INSERT INTO user_access_sessions (token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)",
          )
          .run(digest(token), userId, now, now + 86400000);
        return token;
      })
      .immediate();
  const authenticate = (token: string | undefined): User | null => {
    if (!token || !/^us_[A-Za-z0-9_-]{43}$/.test(token)) return null;
    return (
      (sqlite
        .prepare(
          `SELECT u.id,u.email,u.status,u.role FROM user_access_sessions s JOIN application_users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ? AND u.status = 'active'`,
        )
        .get(digest(token), clock()) as User | undefined) ?? null
    );
  };
  const revokeSession = (token: string | undefined) => {
    if (!token || !/^us_[A-Za-z0-9_-]{43}$/.test(token)) return false;
    return (
      sqlite
        .prepare(
          "UPDATE user_access_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
        )
        .run(clock(), digest(token)).changes === 1
    );
  };
  return {
    provisionVerifiedUser,
    provisionInvitedUser,
    authenticateCredentials,
    list,
    manage,
    issueSession,
    authenticate,
    revokeSession,
  };
}
