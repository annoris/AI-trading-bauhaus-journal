import { dayKeyOf } from "@trading-bauhaus/journal-core";
import { db, accounts } from "@/db";
import { handler, ok } from "@/server/api";
import { queryTrades } from "@/server/trades-query";
import { getTimeZone } from "@/server/settings";
import type { DisciplineDay } from "@/lib/discipline";
export const GET = handler(() => {
  const timeZone = getTimeZone();
  const currencies = new Map(
    db
      .select()
      .from(accounts)
      .all()
      .map((a) => [a.id, a.currency]),
  );
  const days = new Map<string, DisciplineDay>();
  for (const trade of queryTrades({}).trades) {
    if (!trade.closedAt || trade.status === "open") continue;
    const date = dayKeyOf(trade.closedAt, timeZone),
      currency = currencies.get(trade.accountId) ?? "USD";
    const key = `${date}:${currency}`;
    const day = days.get(key) ?? { date, currency, netPnl: 0, trades: 0 };
    day.netPnl += trade.netPnl;
    day.trades++;
    days.set(key, day);
  }
  return ok({ days: [...days.values()], timeZone });
});
