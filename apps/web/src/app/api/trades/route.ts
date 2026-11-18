import { readFilters, tradeR, tradeRisk } from "@trading-bauhaus/journal-core";
import { computeMetrics } from "@trading-bauhaus/journal-core";
import { handler, ok } from "@/server/api";
import { db, playbooks } from "@/db";
import { getTimeZone } from "@/server/settings";
import { queryTrades, type TradeFilters } from "@/server/trades-query";

const filtersFrom = (url: URL): TradeFilters => readFilters(url.searchParams);

export const GET = handler(async (request: Request) => {
  const url = new URL(request.url);
  const { rows, trades } = queryTrades(filtersFrom(url));
  const timeZone = getTimeZone();
  const playbookNames = new Map(
    db
      .select({ id: playbooks.id, name: playbooks.name })
      .from(playbooks)
      .all()
      .map((playbook) => [playbook.id, playbook.name]),
  );
  const metrics = computeMetrics(trades, { timeZone });
  const listView = url.searchParams.get("view") === "list";
  return ok({
    timeZone,
    trades: rows.map((row, index) => {
      const { notes, exitsJson, executionIdsJson, tagsJson, mistakesJson, ...summary } = row;
      return {
        ...(listView ? summary : row),
        plannedRisk: tradeRisk(trades[index]!),
        realizedR: tradeR(trades[index]!),
        playbookName: row.playbookId ? (playbookNames.get(row.playbookId) ?? null) : null,
        contractMultiplier: trades[index]!.contractMultiplier ?? null,
        tags: trades[index]!.annotations?.tags ?? [],
        mistakes: trades[index]!.annotations?.mistakes ?? [],
        reviewed: row.reviewedAt !== null,
      };
    }),
    metrics,
  });
});
