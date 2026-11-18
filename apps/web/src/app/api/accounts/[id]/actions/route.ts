import { removeTradeReferences } from "@/server/trade-references";
import { and, eq } from "drizzle-orm";
import {
  accounts,
  db,
  executions,
  trades,
  attachments,
  notes,
  tradeRuleChecks,
  tradeExcursions,
} from "@/db";
import { bad, handler, ok, requireValue } from "@/server/api";
import { nowIso } from "@/server/ids";
import { rebuildAccount } from "@/server/rebuild";
import { syncAccount } from "@/server/sync";
import { ibkrTransferTimeZone } from "@/server/ibkr-sync-timezone";

type Params = { params: Promise<{ id: string }> };

interface ActionBody {
  action: "archive" | "unarchive" | "clear" | "sync" | "transfer";
  /** For "transfer": destination account id. */
  toAccountId?: string;
}

export const POST = handler(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const account = db.select().from(accounts).where(eq(accounts.id, id)).get();
  if (!account) return bad("Account not found", 404);
  const body = (await request.json()) as ActionBody;

  switch (body.action) {
    case "archive":
      db.update(accounts).set({ archivedAt: nowIso() }).where(eq(accounts.id, id)).run();
      return ok({ archived: true });
    case "unarchive":
      db.update(accounts).set({ archivedAt: null }).where(eq(accounts.id, id)).run();
      return ok({ archived: false });
    case "clear":
      db.transaction((tx) => {
        removeTradeReferences(
          tx
            .select({ key: trades.key })
            .from(trades)
            .where(eq(trades.accountId, id))
            .all()
            .map((row) => row.key),
        );
        tx.delete(trades).where(eq(trades.accountId, id)).run();
        tx.delete(executions).where(eq(executions.accountId, id)).run();
        tx.update(accounts).set({ ibkrSyncTimeZone: null }).where(eq(accounts.id, id)).run();
      });
      return ok({ cleared: true });
    case "sync":
      return ok({ sync: await syncAccount(id) });
    case "transfer": {
      if (!body.toAccountId) return bad("toAccountId is required");
      const destinationId = body.toAccountId;
      requireValue(destinationId !== id, "Choose a different destination account.");
      const destination = db.select().from(accounts).where(eq(accounts.id, destinationId)).get();
      if (!destination) return bad("Destination account not found", 404);

      db.transaction(
        (tx) => {
          const currentSource = tx.select().from(accounts).where(eq(accounts.id, id)).get();
          const currentDestination = tx
            .select()
            .from(accounts)
            .where(eq(accounts.id, destinationId))
            .get();
          requireValue(currentSource && currentDestination, "Account not found.");
          const sourceTrades = tx.select().from(trades).where(eq(trades.accountId, id)).all();
          const estimates = sourceTrades.flatMap((source) => {
            const cached = tx
              .select()
              .from(tradeExcursions)
              .where(eq(tradeExcursions.tradeKey, source.key))
              .get();
            return cached ? [cached] : [];
          });
          const timeZone = ibkrTransferTimeZone(currentSource, currentDestination);
          if (timeZone !== undefined)
            tx.update(accounts)
              .set({ ibkrSyncTimeZone: timeZone })
              .where(eq(accounts.id, destinationId))
              .run();
          tx.update(executions)
            .set({ accountId: destinationId })
            .where(eq(executions.accountId, id))
            .run();
          tx.delete(trades).where(eq(trades.accountId, id)).run();
          rebuildAccount(destinationId);
          for (const source of sourceTrades) {
            const newKey = destinationId + source.key.slice(id.length);
            const target = tx.select().from(trades).where(eq(trades.key, newKey)).get();
            const identity = (value: string) =>
              JSON.stringify((JSON.parse(value) as string[]).sort());
            requireValue(
              target && identity(target.executionIdsJson) === identity(source.executionIdsJson),
              "Cannot transfer trades that merge with destination positions. Use a separate destination account.",
            );
            tx.update(trades)
              .set({
                notes: source.notes,
                tagsJson: source.tagsJson,
                mistakesJson: source.mistakesJson,
                playbookId: source.playbookId,
                rating: source.rating,
                stopLoss: source.stopLoss,
                profitTarget: source.profitTarget,
                reviewedAt: source.reviewedAt,
              })
              .where(eq(trades.key, newKey))
              .run();
            tx.update(attachments)
              .set({ ownerId: newKey })
              .where(and(eq(attachments.ownerType, "trade"), eq(attachments.ownerId, source.key)))
              .run();
            tx.update(notes).set({ tradeKey: newKey }).where(eq(notes.tradeKey, source.key)).run();
            tx.update(tradeRuleChecks)
              .set({ tradeKey: newKey })
              .where(eq(tradeRuleChecks.tradeKey, source.key))
              .run();
            const cached = estimates.find((row) => row.tradeKey === source.key);
            // Keep cached data with its original fingerprint; estimates invalidate
            // naturally if reconstruction/currency changed during transfer.
            if (cached)
              tx.insert(tradeExcursions)
                .values({ ...cached, tradeKey: newKey })
                .onConflictDoNothing()
                .run();
          }
          tx.update(accounts).set({ ibkrSyncTimeZone: null }).where(eq(accounts.id, id)).run();
        },
        { behavior: "immediate" },
      );
      return ok({ transferred: true });
    }
    default:
      return bad("Unknown action");
  }
});
