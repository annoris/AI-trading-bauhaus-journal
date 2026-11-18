import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { createApplicationErrorStore } from "../src/server/errors/store";
import { createSupportStore } from "../src/server/support/store";

let sqlite: Database.Database | undefined;
afterEach(() => {
  sqlite?.close();
  sqlite = undefined;
});

describe("redacted server error references", () => {
  it("stores only reduced route metadata and ties support references to the same account", () => {
    sqlite = new Database(":memory:");
    let now = Date.parse("2026-11-03T12:00:00Z");
    const errors = createApplicationErrorStore(sqlite, () => now);
    const reference = errors.record({
      route: "/api/trades/1234567890abcdef1234567890abcdef/market-data",
      method: "POST",
      actor: "member",
      actorId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    expect(errors.summary()).toMatchObject({
      last7Days: 1,
      recent: [
        { errorId: reference, route: "/api/trades/[resource]", method: "POST", actor: "member" },
      ],
    });
    const columns = sqlite.pragma("table_info(application_errors)") as { name: string }[];
    expect(columns.map((column) => column.name)).not.toContain("message");
    expect(columns.map((column) => column.name)).not.toContain("stack");

    const reports = createSupportStore(sqlite, () => now);
    const baseReport = {
      reporterEmail: "member@example.com",
      category: "other",
      subject: "A private issue",
      description: "A synthetic report that includes a server reference.",
      route: "/support",
      errorId: reference,
    };
    const saved = reports.create({ ...baseReport, reporterId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" });
    expect(saved.errorId).toBe(reference);
    expect(() =>
      reports.create({ ...baseReport, reporterId: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }),
    ).toThrow("does not match this account");

    now += 30 * 86400000 + 1;
    expect(errors.belongsToActor(reference, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe(false);
  });
});
