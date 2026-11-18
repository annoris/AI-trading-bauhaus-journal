import { createHash, randomBytes } from "node:crypto";
import type Database from "better-sqlite3";

export const ERROR_RETENTION_MS = 30 * 86400000;

export type ApplicationErrorEvent = {
  errorId: string;
  route: string;
  method: string;
  actor: "owner" | "member";
  occurredAt: number;
};

export function applicationErrorActorHash(actorId: string): string {
  return createHash("sha256").update(actorId).digest("hex");
}

function safeRoute(path: string): string {
  const segments = path.split("/").filter(Boolean);
  if (segments[0] !== "api") return "/api/[route]";
  const domain = segments[1] ?? "[route]";
  return `/api/${domain}${segments.length > 2 ? "/[resource]" : ""}`.slice(0, 120);
}

export function createApplicationErrorStore(sqlite: Database.Database, clock = Date.now) {
  sqlite.exec(`CREATE TABLE IF NOT EXISTS application_errors (
    error_id TEXT PRIMARY KEY,
    route TEXT NOT NULL,
    method TEXT NOT NULL,
    actor TEXT NOT NULL CHECK(actor IN ('owner','member')),
    actor_hash TEXT NOT NULL DEFAULT '',
    occurred_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS application_error_time ON application_errors(occurred_at DESC);`);
  const columns = sqlite.pragma("table_info(application_errors)") as { name: string }[];
  if (!columns.some((column) => column.name === "actor_hash")) {
    sqlite.exec("ALTER TABLE application_errors ADD COLUMN actor_hash TEXT NOT NULL DEFAULT ''");
  }

  const purge = () =>
    sqlite
      .prepare("DELETE FROM application_errors WHERE occurred_at <= ?")
      .run(clock() - ERROR_RETENTION_MS).changes;

  const record = (input: {
    route: string;
    method: string;
    actor: "owner" | "member";
    actorId: string;
  }): string =>
    sqlite
      .transaction(() => {
        purge();
        const errorId = randomBytes(8).toString("hex");
        const method = /^[A-Z]{3,8}$/.test(input.method) ? input.method : "OTHER";
        sqlite
          .prepare(
            "INSERT INTO application_errors (error_id,route,method,actor,actor_hash,occurred_at) VALUES (?,?,?,?,?,?)",
          )
          .run(
            errorId,
            safeRoute(input.route),
            method,
            input.actor,
            applicationErrorActorHash(input.actorId),
            clock(),
          );
        sqlite
          .prepare(
            "DELETE FROM application_errors WHERE error_id IN (SELECT error_id FROM application_errors ORDER BY occurred_at DESC,error_id DESC LIMIT -1 OFFSET 20000)",
          )
          .run();
        return errorId;
      })
      .immediate();

  const summary = () => {
    purge();
    const last7Days = clock() - 7 * 86400000;
    const total = (
      sqlite
        .prepare("SELECT count(*) AS n FROM application_errors WHERE occurred_at > ?")
        .get(last7Days) as { n: number }
    ).n;
    const recent = sqlite
      .prepare(
        `SELECT error_id AS errorId,route,method,actor,occurred_at AS occurredAt
         FROM application_errors ORDER BY occurred_at DESC,error_id DESC LIMIT 100`,
      )
      .all() as ApplicationErrorEvent[];
    return { last7Days: total, retentionDays: 30, recent };
  };

  const belongsToActor = (errorId: string, actorId: string) =>
    Boolean(
      sqlite
        .prepare(
          "SELECT 1 FROM application_errors WHERE error_id = ? AND actor_hash = ? AND occurred_at > ?",
        )
        .get(errorId, applicationErrorActorHash(actorId), clock() - ERROR_RETENTION_MS),
    );

  return { record, summary, purge, belongsToActor };
}
