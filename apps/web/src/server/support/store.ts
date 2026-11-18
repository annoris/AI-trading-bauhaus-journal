import { randomBytes } from "node:crypto";
import type Database from "better-sqlite3";
import { createApplicationErrorStore } from "@/server/errors/store";

export const SUPPORT_SCHEMA = `
CREATE TABLE IF NOT EXISTS support_reports (
 id TEXT PRIMARY KEY,
 reporter_id TEXT NOT NULL,
 reporter_email TEXT NOT NULL,
 category TEXT NOT NULL,
 subject TEXT NOT NULL,
 description TEXT NOT NULL,
 route TEXT NOT NULL,
 error_id TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL CHECK(status IN ('open','in_progress','resolved')) DEFAULT 'open',
 owner_reply TEXT NOT NULL DEFAULT '',
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS support_report_created ON support_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS support_report_reporter ON support_reports(reporter_id,created_at DESC);
CREATE INDEX IF NOT EXISTS support_report_status ON support_reports(status,created_at DESC);`;

export type SupportStatus = "open" | "in_progress" | "resolved";
export type SupportCategory = "profile" | "journal" | "imports" | "ai" | "access" | "other";

export type SupportReport = {
  id: string;
  reporterId: string;
  reporterEmail: string;
  category: SupportCategory;
  subject: string;
  description: string;
  route: string;
  errorId: string;
  status: SupportStatus;
  ownerReply: string;
  createdAt: number;
  updatedAt: number;
};

export class SupportError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const categories = new Set<SupportCategory>([
  "profile",
  "journal",
  "imports",
  "ai",
  "access",
  "other",
]);
const statuses = new Set<SupportStatus>(["open", "in_progress", "resolved"]);

function normalizeRoute(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.length > 200 ||
    value.includes("?") ||
    value.includes("#") ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    throw new SupportError(400, "Refresh the page and submit the report again.");
  const segments = value.split("/").filter(Boolean);
  if (!segments.length) return "/";
  return `/${segments[0]}${segments.length > 1 ? "/[page]" : ""}`.slice(0, 100);
}

export function createSupportStore(sqlite: Database.Database, clock = Date.now) {
  sqlite.exec(SUPPORT_SCHEMA);
  const errorStore = createApplicationErrorStore(sqlite, clock);
  const reportColumns = sqlite.pragma("table_info(support_reports)") as { name: string }[];
  if (!reportColumns.some((column) => column.name === "error_id")) {
    sqlite.exec("ALTER TABLE support_reports ADD COLUMN error_id TEXT NOT NULL DEFAULT ''");
  }
  const listForReporter = (reporterId: string) =>
    sqlite
      .prepare(
        `SELECT id,reporter_id AS reporterId,reporter_email AS reporterEmail,category,subject,
         description,route,error_id AS errorId,status,owner_reply AS ownerReply,created_at AS createdAt,updated_at AS updatedAt
         FROM support_reports WHERE reporter_id = ? ORDER BY created_at DESC,id LIMIT 100`,
      )
      .all(reporterId) as SupportReport[];
  const listAll = () =>
    sqlite
      .prepare(
        `SELECT id,reporter_id AS reporterId,reporter_email AS reporterEmail,category,subject,
         description,route,error_id AS errorId,status,owner_reply AS ownerReply,created_at AS createdAt,updated_at AS updatedAt
         FROM support_reports ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
         created_at DESC,id LIMIT 200`,
      )
      .all() as SupportReport[];
  const create = (input: {
    reporterId: string;
    reporterEmail: string;
    category: unknown;
    subject: unknown;
    description: unknown;
    route: unknown;
    errorId: unknown;
  }) => {
    if (!input.reporterId || input.reporterId.length > 64)
      throw new SupportError(400, "Could not identify this account. Sign in again and retry.");
    const reporterEmail = input.reporterEmail.trim().toLowerCase();
    if (!reporterEmail || reporterEmail.length > 254)
      throw new SupportError(400, "Could not identify this account. Sign in again and retry.");
    if (typeof input.category !== "string" || !categories.has(input.category as SupportCategory))
      throw new SupportError(400, "Choose a valid issue category.");
    const subject = input.subject;
    if (typeof subject !== "string" || subject.trim().length < 4 || subject.length > 120)
      throw new SupportError(400, "Use a subject between 4 and 120 characters.");
    const description = input.description;
    if (
      typeof description !== "string" ||
      description.trim().length < 10 ||
      description.length > 4000
    )
      throw new SupportError(400, "Describe the issue in 10 to 4,000 characters.");
    const route = normalizeRoute(input.route);
    const errorId =
      typeof input.errorId === "string" && /^[a-f0-9]{16}$/.test(input.errorId)
        ? input.errorId
        : "";
    if (errorId) {
      if (!errorStore.belongsToActor(errorId, input.reporterId))
        throw new SupportError(
          400,
          "That error reference does not match this account or may have expired.",
        );
    }
    return sqlite
      .transaction(() => {
        const now = clock();
        const count = (
          sqlite
            .prepare(
              "SELECT count(*) AS n FROM support_reports WHERE reporter_id = ? AND created_at > ?",
            )
            .get(input.reporterId, now - 86400000) as { n: number }
        ).n;
        if (count >= 10) throw new SupportError(429, "Report limit reached. Try again tomorrow.");
        const id = randomBytes(16).toString("hex");
        sqlite
          .prepare(
            `INSERT INTO support_reports
             (id,reporter_id,reporter_email,category,subject,description,route,error_id,status,created_at,updated_at)
             VALUES (?,?,?,?,?,?,?,?,'open',?,?)`,
          )
          .run(
            id,
            input.reporterId,
            reporterEmail,
            input.category,
            subject.trim(),
            description.trim(),
            route,
            errorId,
            now,
            now,
          );
        return sqlite
          .prepare(
            `SELECT id,reporter_id AS reporterId,reporter_email AS reporterEmail,category,subject,
             description,route,error_id AS errorId,status,owner_reply AS ownerReply,created_at AS createdAt,updated_at AS updatedAt
             FROM support_reports WHERE id = ?`,
          )
          .get(id) as SupportReport;
      })
      .immediate();
  };
  const update = (id: string, status: unknown, ownerReply: unknown) => {
    if (!/^[a-f0-9]{32}$/.test(id)) throw new SupportError(400, "Invalid support report.");
    if (typeof status !== "string" || !statuses.has(status as SupportStatus))
      throw new SupportError(400, "Choose a valid report status.");
    if (typeof ownerReply !== "string" || ownerReply.length > 4000)
      throw new SupportError(400, "The reply cannot exceed 4,000 characters.");
    const changed = sqlite
      .prepare("UPDATE support_reports SET status = ?,owner_reply = ?,updated_at = ? WHERE id = ?")
      .run(status, ownerReply.trim(), clock(), id).changes;
    if (!changed) throw new SupportError(404, "Support report not found.");
    return sqlite
      .prepare(
        `SELECT id,reporter_id AS reporterId,reporter_email AS reporterEmail,category,subject,
         description,route,error_id AS errorId,status,owner_reply AS ownerReply,created_at AS createdAt,updated_at AS updatedAt
         FROM support_reports WHERE id = ?`,
      )
      .get(id) as SupportReport;
  };
  return { listForReporter, listAll, create, update };
}
