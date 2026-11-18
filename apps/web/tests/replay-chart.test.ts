import { expect, it } from "vitest";
import type { MarketBar } from "../src/lib/market-data";
import {
  buildExecutionPriceOption,
  buildMarketReplayOption,
} from "../src/components/charts/price-chart-options";
import type { VizTokens } from "../src/components/charts/tokens";

const tokens: VizTokens = {
  surface: "#111",
  inkMuted: "#aaa",
  gridline: "#333",
  baseline: "#444",
  brand: "#0c8",
  profit: "#0c8",
  profitFill: "#0c8333",
  loss: "#f44",
  series: [],
  foreground: "#fff",
  card: "#111",
  border: "#333",
};
const start = Date.parse("2026-10-06T10:00:00Z");
const bars: MarketBar[] = [0, 1, 2].map((minute) => ({
  time: start + minute * 60_000,
  open: 100 + minute,
  high: 102 + minute,
  low: 99 + minute,
  close: 101 + minute,
  volume: 10 + minute,
}));

it("builds ECharts candles, volume and entry/exit markers from the supplied replay frame", () => {
  const option = buildMarketReplayOption(
    "MNQ",
    "1m",
    bars.slice(0, 2),
    [
      {
        side: "buy",
        quantity: 1,
        price: 100.5,
        executedAt: new Date(start + 30_000).toISOString(),
      },
      {
        side: "sell",
        quantity: 1,
        price: 102.5,
        executedAt: new Date(start + 90_000).toISOString(),
      },
      { side: "buy", quantity: 1, price: 105, executedAt: new Date(start + 180_000).toISOString() },
    ],
    tokens,
    "America/New_York",
  );
  const series = option.series as Array<Record<string, unknown>>;
  expect(series.find((item) => item.type === "candlestick")?.data).toEqual([
    [100, 101, 99, 102],
    [101, 102, 100, 103],
  ]);
  expect(series.find((item) => item.name === "Volume")?.data).toHaveLength(2);
  expect(series.find((item) => item.name === "Buy fills")?.data).toEqual([
    { name: "BUY 1", value: [0, 100.5] },
  ]);
  expect(series.find((item) => item.name === "Sell fills")?.data).toEqual([
    { name: "SELL 1", value: [1, 102.5] },
  ]);
  expect(option.dataZoom).toHaveLength(2);
});

it("builds a fills-only price chart with buy/sell markers and net P&L", () => {
  const option = buildExecutionPriceOption(
    {
      symbol: "MNQ",
      netPnl: 42.5,
      avgEntry: 100,
      avgExit: 102,
      closedAt: new Date(start + 120_000).toISOString(),
    },
    [
      { side: "buy", quantity: 1, price: 100, executedAt: new Date(start).toISOString() },
      {
        side: "sell",
        quantity: 1,
        price: 102,
        executedAt: new Date(start + 120_000).toISOString(),
      },
    ],
    tokens,
    "America/New_York",
  );
  const series = option.series as Array<Record<string, unknown>>;
  expect(series.find((item) => item.type === "line")?.data).toEqual([100, 102]);
  expect(series.find((item) => item.name === "Buy fills")?.data).toHaveLength(1);
  expect(series.find((item) => item.name === "Sell fills")?.data).toHaveLength(1);
  expect(series.find((item) => item.name === "Net P&L")?.data).toEqual([
    { name: expect.stringContaining("42.50"), value: [1, 102] },
  ]);
});
