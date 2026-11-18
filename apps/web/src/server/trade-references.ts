import { and, eq, inArray } from "drizzle-orm";
import { db, attachments, tradeRuleChecks, notes } from "@/db";
/** Call inside the transaction deleting trades. Retain notebook content but
 * remove anchors and trade-owned blobs/checks that would otherwise be orphaned. */
export function removeTradeReferences(keys: string[]): void {
  for (let i = 0; i < keys.length; i += 400) {
    const batch = keys.slice(i, i + 400);
    db.delete(attachments)
      .where(and(eq(attachments.ownerType, "trade"), inArray(attachments.ownerId, batch)))
      .run();
    db.delete(tradeRuleChecks).where(inArray(tradeRuleChecks.tradeKey, batch)).run();
    db.update(notes).set({ tradeKey: null }).where(inArray(notes.tradeKey, batch)).run();
  }
}
