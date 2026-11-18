import { expect, it } from "vitest";
import type { AnnotatedTrade } from "@trading-bauhaus/journal-core";
import { tradingReview } from "../src/lib/trading-review";
const trade = (key: string, changes: Partial<AnnotatedTrade> = {}): AnnotatedTrade => ({
  key,
  accountId: "a",
  symbol: "AAPL",
  direction: "long",
  status: "loss",
  openedAt: "2026-10-01T10:00:00Z",
  closedAt: "2026-10-01T11:00:00Z",
  quantity: 1,
  openQuantity: 0,
  avgEntry: 100,
  grossPnl: -9,
  netPnl: -10,
  fees: 1,
  executionCount: 2,
  executionIds: [],
  exits: [],
  ...changes,
});
it("excludes open trades and counts a loss once across multiple mistakes", () => {
  const result = tradingReview([
    trade("loss", { annotations: { mistakes: ["FOMO", "Late entry"], stopLoss: 90 } }),
    trade("win", {
      status: "win",
      netPnl: 20,
      annotations: { mistakes: ["FOMO"], reviewed: true },
    }),
    trade("open", { status: "open", annotations: { mistakes: ["FOMO"], stopLoss: 90 } }),
  ]);
  expect(result).toMatchObject({
    closed: 2,
    reviewed: 1,
    withMistakes: 2,
    mistakeLosses: 10,
    riskCoverage: 1,
  });
  expect(result.pending.map((t) => t.key)).toEqual(["loss"]);
});
it("handles empty data and limits the queue to five most recent closed trades", () => {
  expect(tradingReview([])).toMatchObject({ closed: 0, mistakeLosses: 0, pending: [] });
  const result = tradingReview(
    Array.from({ length: 8 }, (_, i) =>
      trade(String(i), { closedAt: `2026-10-0${i + 1}T11:00:00Z` }),
    ),
  );
  expect(result.pending.map((t) => t.key)).toEqual(["7", "6", "5", "4", "3"]);
});
