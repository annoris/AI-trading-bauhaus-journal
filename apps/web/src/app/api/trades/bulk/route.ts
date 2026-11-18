import { eq, inArray } from "drizzle-orm";
import { db, trades, playbooks } from "@/db";
import { bad, handler, ok, requireValue } from "@/server/api";
import { deleteExecutionsForTrades } from "@/server/executions";
import { nowIso } from "@/server/ids";

interface BulkBody {
  keys: string[];
  action: "review" | "unreview" | "tag" | "untag" | "playbook" | "delete";
  tag?: string;
  playbookId?: string | null;
}

export const POST = handler(async (request: Request) => {
  const body = (await request.json()) as BulkBody;
  if (
    !body ||
    !Array.isArray(body.keys) ||
    body.keys.length === 0 ||
    body.keys.length > 500 ||
    !body.keys.every((key) => typeof key === "string" && key.length > 0 && key.length <= 300)
  )
    return bad("Choose 1–500 valid trade keys.");
  const rows = db.select().from(trades).where(inArray(trades.key, body.keys)).all();

  switch (body.action) {
    case "review":
    case "unreview":
      db.update(trades)
        .set({ reviewedAt: body.action === "review" ? nowIso() : null })
        .where(inArray(trades.key, body.keys))
        .run();
      return ok({ updated: rows.length });
    case "tag":
    case "untag": {
      if (typeof body.tag !== "string" || !body.tag.trim() || body.tag.length > 200)
        return bad("Tag must be 1–200 characters.");
      const tag = body.tag;
      db.transaction((tx) => {
        for (const row of rows) {
          const tags = new Set<string>(row.tagsJson ? (JSON.parse(row.tagsJson) as string[]) : []);
          if (body.action === "tag") tags.add(tag);
          else tags.delete(tag);
          requireValue(tags.size <= 100, "A trade can have at most 100 tags.");
          tx.update(trades)
            .set({ tagsJson: JSON.stringify([...tags]) })
            .where(eq(trades.key, row.key))
            .run();
        }
      });
      return ok({ updated: rows.length });
    }
    case "playbook":
      if (
        body.playbookId != null &&
        (typeof body.playbookId !== "string" ||
          !db.select().from(playbooks).where(eq(playbooks.id, body.playbookId)).get())
      )
        return bad("Playbook not found.");
      db.update(trades)
        .set({ playbookId: body.playbookId ?? null })
        .where(inArray(trades.key, body.keys))
        .run();
      return ok({ updated: rows.length });
    case "delete": {
      const byAccount = new Map<string, string[]>();
      for (const row of rows) {
        const ids = JSON.parse(row.executionIdsJson) as string[];
        byAccount.set(row.accountId, [...(byAccount.get(row.accountId) ?? []), ...ids]);
      }
      db.transaction(() => {
        for (const [accountId, executionIds] of byAccount) {
          deleteExecutionsForTrades(accountId, executionIds);
        }
      });
      return ok({ deleted: rows.length });
    }
    default:
      return bad("Unknown action");
  }
});
