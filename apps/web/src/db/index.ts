import { AsyncLocalStorage } from "node:async_hooks";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { chmodSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import * as schema from "./schema";
import { BOOTSTRAP_SQL } from "./bootstrap";

export const dataDir = (): string => process.env.JOURNAL_DATA_DIR ?? join(process.cwd(), "data");

const createDbAt = (path: string) => {
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.exec(BOOTSTRAP_SQL);
  const folderColumns = sqlite.pragma("table_info(folders)") as { name: string }[];
  if (!folderColumns.some((column) => column.name === "deleted_at")) {
    sqlite.exec("ALTER TABLE folders ADD COLUMN deleted_at TEXT");
  }
  sqlite
    .transaction(() => {
      const columns = sqlite.pragma("table_info(accounts)") as { name: string }[];
      if (!columns.some((column) => column.name === "ibkr_sync_time_zone")) {
        sqlite.exec("ALTER TABLE accounts ADD COLUMN ibkr_sync_time_zone TEXT");
      }
    })
    .immediate();
  const executionColumns = sqlite.pragma("table_info(executions)") as { name: string }[];
  if (!executionColumns.some((column) => column.name === "import_metadata_json")) {
    sqlite.exec("ALTER TABLE executions ADD COLUMN import_metadata_json TEXT");
  }
  const csvColumns = sqlite.pragma("table_info(market_csv_datasets)") as { name: string }[];
  sqlite.transaction(() => {
    for (const name of ["bar_count", "first_time", "last_time"]) {
      if (!csvColumns.some((column) => column.name === name))
        sqlite.exec(
          `ALTER TABLE market_csv_datasets ADD COLUMN ${name} INTEGER NOT NULL DEFAULT 0`,
        );
    }
    sqlite.exec(`UPDATE market_csv_datasets SET
      bar_count = json_array_length(bars_json),
      first_time = json_extract(bars_json, '$[0].time'),
      last_time = json_extract(bars_json, '$[#-1].time') WHERE bar_count = 0`);
  })();
  return drizzle(sqlite, { schema });
};

type JournalDb = ReturnType<typeof createDbAt>;
const globalForDb = globalThis as typeof globalThis & {
  __journalDb?: JournalDb;
  __journalUserDbs?: Map<string, JournalDb>;
  __journalPublicDemoDb?: JournalDb;
};
const userDbs = (globalForDb.__journalUserDbs ??= new Map<string, JournalDb>());
const activeDb = new AsyncLocalStorage<JournalDb>();
const activeScope = new AsyncLocalStorage<"owner" | "member" | "demo">();

/** Server-side request identity scope for settings that must not be shared across journals. */
export function journalCredentialScope(): "owner" | "member" | "demo" {
  return activeScope.getStore() ?? "owner";
}

function defaultDatabase(): JournalDb {
  return (
    globalForDb.__journalDb ?? (globalForDb.__journalDb = createDbAt(join(dataDir(), "journal.db")))
  );
}

function userDb(userId: string): JournalDb {
  if (!/^[a-f0-9]{32}$/.test(userId)) throw new Error("Invalid journal user.");
  let database = userDbs.get(userId);
  if (!database) {
    const userDirectory = join(dataDir(), "users", userId);
    mkdirSync(userDirectory, { recursive: true, mode: 0o700 });
    if (process.platform !== "win32") chmodSync(userDirectory, 0o700);
    const path = join(userDirectory, "journal.db");
    database = createDbAt(path);
    if (process.platform !== "win32") chmodSync(path, 0o600);
    userDbs.set(userId, database);
  }
  return database;
}

function publicDemoDb(): JournalDb {
  const directory = join(dataDir(), "public-demo");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (process.platform !== "win32") chmodSync(directory, 0o700);

  const path = join(directory, "journal.db");
  const existing = globalForDb.__journalPublicDemoDb;
  if (existing) {
    if (process.platform !== "win32") chmodSync(path, 0o600);
    return existing;
  }

  const database = createDbAt(path);
  if (process.platform !== "win32") chmodSync(path, 0o600);
  globalForDb.__journalPublicDemoDb = database;
  return database;
}

/** Run a request using the database selected by the authenticated user ID. */
export function runWithUserDatabase<T>(userId: string, callback: () => T): T {
  return activeScope.run("member", () => activeDb.run(userDb(userId), callback));
}

/** Run a request using the isolated, read-only public demo database. */
export function runWithDemoDatabase<T>(callback: () => T): T {
  return activeScope.run("demo", () => activeDb.run(publicDemoDb(), callback));
}

/** Keep identity, invitation and platform audit tables in the legacy owner database. */
export function runWithDefaultDatabase<T>(callback: () => T): T {
  return activeScope.run("owner", () => activeDb.run(defaultDatabase(), callback));
}

/** Shared app queries are transparently scoped to the authenticated user's SQLite file. */
export const db = new Proxy(Object.create(null) as JournalDb, {
  get(_target, property) {
    // Keep the owner database lazy: importing a route while serving the public
    // demo must not open or bootstrap the private journal before ALS is set.
    const selected = activeDb.getStore() ?? defaultDatabase();
    const value = Reflect.get(selected, property, selected) as unknown;
    return typeof value === "function" ? value.bind(selected) : value;
  },
}) as JournalDb;

export * from "./schema";
