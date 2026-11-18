import { readFilters } from "@trading-bauhaus/journal-core";
import { eq, inArray } from "drizzle-orm";
import { computeMetrics, dayKeyOf, intradayCurve } from "@trading-bauhaus/journal-core";
import { db, executions, journalDays } from "@/db";
import { bad, handler, ok } from "@/server/api";
import { nowIso } from "@/server/ids";
import { getTimeZone } from "@/server/settings";
import { queryTrades } from "@/server/trades-query";

type Params = { params: Promise<{ date: string }> };

export const GET = handler(async (request: Request, { params }: Params) => {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad("date must be YYYY-MM-DD");
  const url = new URL(request.url);
  const timeZone = getTimeZone();

  const { rows, trades } = queryTrades(readFilters(url.searchParams));
  const dayTradeIndexes = trades
    .map((trade, index) => ({ trade, index }))
    .filter(({ trade }) => trade.closedAt && dayKeyOf(trade.closedAt, timeZone) === date);
  const dayTrades = dayTradeIndexes.map(({ trade }) => trade);

  // Intraday curve needs exit timestamps — only query needed executions by primary key.
  const times = new Map<string, string>();
  const neededIds = [
    ...new Set(
      dayTrades.flatMap((trade) =>
        trade.exits && trade.exits.length > 0
          ? trade.exits.map((e) => e.executionId)
          : trade.executionIds,
      ),
    ),
  ];
  if (neededIds.length > 0) {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < neededIds.length; i += CHUNK_SIZE) {
      const chunk = neededIds.slice(i, i + CHUNK_SIZE);
      const fills = db
        .select({ id: executions.id, executedAt: executions.executedAt })
        .from(executions)
        .where(inArray(executions.id, chunk))
        .all();
      for (const fill of fills) times.set(fill.id, fill.executedAt);
    }
  }

  const note = db.select().from(journalDays).where(eq(journalDays.date, date)).get();
  return ok({
    date,
    metrics: computeMetrics(dayTrades, { timeZone }),
    trades: dayTradeIndexes.map(({ index }) => rows[index]),
    intraday: intradayCurve(dayTrades, times, date, timeZone),
    note: note?.note ?? "",
  });
});

export const PUT = handler(async (request: Request, { params }: Params) => {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad("date must be YYYY-MM-DD");
  const { note } = (await request.json()) as { note?: string };
  db.insert(journalDays)
    .values({ date, note: note ?? "", updatedAt: nowIso() })
    .onConflictDoUpdate({
      target: journalDays.date,
      set: { note: note ?? "", updatedAt: nowIso() },
    })
    .run();
  return ok({ saved: true });
});
