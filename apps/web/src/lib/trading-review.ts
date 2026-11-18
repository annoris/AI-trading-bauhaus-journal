import { tradeRisk, type AnnotatedTrade } from "@trading-bauhaus/journal-core";

/** Closed trades only; each trade contributes once even when it has several mistakes. */
export function tradingReview(trades: AnnotatedTrade[]) {
  const closed = trades.filter((trade) => trade.status !== "open");
  const marked = closed.filter((trade) => trade.annotations?.mistakes?.length);
  return {
    closed: closed.length,
    reviewed: closed.filter((trade) => trade.annotations?.reviewed).length,
    withMistakes: marked.length,
    mistakeLosses: marked.reduce((sum, trade) => sum + Math.max(0, -trade.netPnl), 0),
    riskCoverage: closed.filter((trade) => tradeRisk(trade) !== null).length,
    pending: [...closed]
      .filter((trade) => !trade.annotations?.reviewed)
      .sort(
        (a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? "") || a.key.localeCompare(b.key),
      )
      .slice(0, 5)
      .map((trade) => ({
        key: trade.key,
        symbol: trade.symbol,
        netPnl: trade.netPnl,
        mistakes: trade.annotations?.mistakes ?? [],
      })),
  };
}
export type TradingReview = ReturnType<typeof tradingReview>;
