import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
const dir = mkdtempSync(join(tmpdir(), "bauhaus-transfer-"));
vi.stubEnv("JOURNAL_DATA_DIR", dir);
vi.stubEnv("JOURNAL_PASSWORD", "");
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
const { db, accounts, executions, trades, attachments, notes, tradeRuleChecks, tradeExcursions } =
  await import("../src/db");
const { rebuildAccount } = await import("../src/server/rebuild");
const { POST: transfer } = await import("../src/app/api/accounts/[id]/actions/route");
const { POST: bulk } = await import("../src/app/api/trades/bulk/route");
beforeEach(() => {
  db.$client.exec(
    "DELETE FROM attachments;DELETE FROM notes;DELETE FROM trade_rule_checks;DELETE FROM trades;DELETE FROM executions;DELETE FROM accounts;",
  );
  for (const id of ["a", "b"])
    db.insert(accounts).values({ id, name: id, kind: "manual", createdAt: "2026-01-01" }).run();
  for (const [index, side] of ["buy", "sell"].entries())
    db.insert(executions)
      .values({
        id: `fill${index}`,
        accountId: "a",
        symbol: "TEST",
        side: side as "buy" | "sell",
        quantity: 1,
        price: 100 + index,
        fee: 0,
        executedAt: `2026-01-01T10:0${index}:00Z`,
        source: "manual",
        contentHash: `hash${index}`,
        createdAt: "2026-01-01",
      })
      .run();
  rebuildAccount("a");
});
afterAll(() => {
  db.$client.close();
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});
const move = () =>
  transfer(
    new Request("http://localhost/api/accounts/a/actions", {
      method: "POST",
      body: JSON.stringify({ action: "transfer", toAccountId: "b" }),
    }),
    { params: Promise.resolve({ id: "a" }) },
  );
describe("transfer related records atomically", () => {
  it("preserves attachments, linked notes, rule checks and cached estimates", async () => {
    const source = db.select().from(trades).get()!;
    db.insert(attachments)
      .values({
        id: "attachment",
        ownerType: "trade",
        ownerId: source.key,
        name: "chart.png",
        mime: "image/png",
        size: 3,
        data: Buffer.from("png"),
        createdAt: "2026-01-01",
      })
      .run();
    db.insert(notes)
      .values({
        id: "note",
        folderId: "folder",
        tradeKey: source.key,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      })
      .run();
    db.insert(tradeRuleChecks)
      .values({
        id: "rule",
        tradeKey: source.key,
        playbookId: "playbook",
        rule: "Wait",
        followed: true,
      })
      .run();
    db.insert(tradeExcursions)
      .values({
        tradeKey: source.key,
        fingerprint: "original",
        provider: "csv",
        symbol: "TEST",
        resolution: "1m",
        fetchedAt: "2026-01-01",
        estimateJson: "{}",
      })
      .run();
    expect((await move()).status).toBe(200);
    const target = db.select().from(trades).where(eq(trades.accountId, "b")).get()!;
    expect(db.select().from(attachments).get()?.ownerId).toBe(target.key);
    expect(db.select().from(notes).get()?.tradeKey).toBe(target.key);
    expect(db.select().from(tradeRuleChecks).get()?.tradeKey).toBe(target.key);
    expect(db.select().from(tradeExcursions).get()?.tradeKey).toBe(target.key);
  });
  it("rolls back the whole move when positions merge", async () => {
    db.insert(executions)
      .values({
        id: "earlier",
        accountId: "b",
        symbol: "TEST",
        side: "buy",
        quantity: 1,
        price: 99,
        fee: 0,
        executedAt: "2026-01-01T09:00:00Z",
        source: "manual",
        contentHash: "earlier",
        createdAt: "2026-01-01",
      })
      .run();
    rebuildAccount("b");
    const before = db.select().from(trades).all();
    expect((await move()).status).toBe(400);
    expect(db.select().from(trades).all()).toEqual(before);
    expect(db.select().from(executions).where(eq(executions.accountId, "a")).all()).toHaveLength(2);
  });
  it("rejects invalid bulk tags and missing playbooks without mutation", async () => {
    const key = db.select().from(trades).get()!.key;
    for (const body of [
      { keys: [key], action: "tag", tag: {} },
      { keys: [key], action: "playbook", playbookId: "missing" },
      { keys: [{}], action: "review" },
    ]) {
      expect(
        (
          await bulk(
            new Request("http://localhost/api/trades/bulk", {
              method: "POST",
              body: JSON.stringify(body),
            }),
          )
        ).status,
      ).toBe(400);
    }
    expect(db.select().from(trades).get()?.tagsJson).toBeNull();
    expect(db.select().from(trades).get()?.playbookId).toBeNull();
  });
  it("clears trade-owned references but retains unlinked notebook content", async () => {
    const source = db.select().from(trades).get()!;
    db.insert(attachments)
      .values({
        id: "chart",
        ownerType: "trade",
        ownerId: source.key,
        name: "chart.png",
        mime: "image/png",
        size: 3,
        data: Buffer.from("png"),
        createdAt: "2026-01-01",
      })
      .run();
    db.insert(notes)
      .values({
        id: "note",
        folderId: "folder",
        tradeKey: source.key,
        content: "Keep my lesson",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      })
      .run();
    db.insert(tradeRuleChecks)
      .values({
        id: "check",
        tradeKey: source.key,
        playbookId: "playbook",
        rule: "Wait",
        followed: true,
      })
      .run();
    const response = await transfer(
      new Request("http://localhost/api/accounts/a/actions", {
        method: "POST",
        body: JSON.stringify({ action: "clear" }),
      }),
      { params: Promise.resolve({ id: "a" }) },
    );
    expect(response.status).toBe(200);
    expect(db.select().from(attachments).all()).toHaveLength(0);
    expect(db.select().from(tradeRuleChecks).all()).toHaveLength(0);
    expect(db.select().from(notes).get()).toMatchObject({
      tradeKey: null,
      content: "Keep my lesson",
    });
  });
});
