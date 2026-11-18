import type Database from "better-sqlite3";
import { randomBytes } from "node:crypto";
export const ACTIVITY_RETENTION_MS = 7 * 86400000;
type Secrets = {
  seal: (ip: string) => string;
  fingerprint: (ip: string) => string;
  clock?: () => number;
};
export function createActivityStore(sqlite: Database.Database, secrets: Secrets) {
  const clock = secrets.clock ?? Date.now;
  sqlite.exec(`CREATE TABLE IF NOT EXISTS security_activity (
    id TEXT PRIMARY KEY, actor TEXT NOT NULL, event TEXT NOT NULL, status INTEGER NOT NULL,
    ip_encrypted TEXT NOT NULL, ip_fingerprint TEXT NOT NULL, occurred_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS activity_retention ON security_activity(occurred_at);
    CREATE INDEX IF NOT EXISTS activity_ip_time ON security_activity(ip_fingerprint,occurred_at);`);
  const purge = () =>
    sqlite
      .prepare("DELETE FROM security_activity WHERE occurred_at <= ?")
      .run(clock() - ACTIVITY_RETENTION_MS).changes;
  const record = (ip: string, actor: string, event: string, status: number) =>
    sqlite
      .transaction(() => {
        purge();
        if (!/^[a-z-]{1,40}$/.test(event) || actor.length > 64 || !Number.isInteger(status))
          throw new Error("Invalid activity event");
        const now = clock(),
          fingerprint = secrets.fingerprint(ip);
        const recent = (
          sqlite
            .prepare(
              "SELECT count(*) n FROM security_activity WHERE ip_fingerprint = ? AND occurred_at > ?",
            )
            .get(fingerprint, now - 60000) as { n: number }
        ).n;
        if (recent >= 20) return false;
        sqlite
          .prepare("INSERT INTO security_activity VALUES (?,?,?,?,?,?,?)")
          .run(
            randomBytes(16).toString("hex"),
            actor,
            event,
            status,
            secrets.seal(ip),
            fingerprint,
            now,
          );
        sqlite
          .prepare(
            "DELETE FROM security_activity WHERE id IN (SELECT id FROM security_activity ORDER BY occurred_at DESC,id DESC LIMIT -1 OFFSET 50000)",
          )
          .run();
        return true;
      })
      .immediate();
  const summary = () => {
    purge();
    const failed = sqlite
      .prepare(
        `SELECT ip_fingerprint AS source,actor,count(*) AS attempts,max(occurred_at) AS lastSeen
      FROM security_activity WHERE event = 'login-failed' AND occurred_at > ? GROUP BY ip_fingerprint,actor HAVING count(*) >= 10 ORDER BY attempts DESC LIMIT 50`,
      )
      .all(clock() - 600000);
    const recent = sqlite
      .prepare(
        "SELECT actor,event,status,occurred_at AS occurredAt FROM security_activity ORDER BY occurred_at DESC LIMIT 100",
      )
      .all();
    return { retentionDays: 7, suspiciousSources: failed, recent };
  };
  return { record, purge, summary };
}
