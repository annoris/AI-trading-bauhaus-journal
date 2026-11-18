# Trading Bauhaus journal core

Private workspace package for Trading Bauhaus. It contains the domain engine with no IO, no framework, and zero runtime dependencies. It runs in Node and the browser and is not published to npm.

## What it does

Feed it raw executions (fills); it gives you everything a journal displays.

```ts
import {
  buildRoundTrips,
  computeMetrics,
  computeEdgeScore,
  calendarMonth,
  dailyStats,
  dailyCumulative,
  equityCurve,
} from "@trading-bauhaus/journal-core";

const trades = buildRoundTrips(executions, { method: "fifo" });
const metrics = computeMetrics(trades, { timeZone: "America/New_York" });
const edge = computeEdgeScore(metrics);
const calendar = calendarMonth(trades, 2026, 8, "America/New_York");
```

- `buildRoundTrips` turns fills into flat-to-flat trades: partial fills, scale-ins, flips, futures multipliers, FIFO / LIFO / weighted-average lot matching. Deterministic, with rebuild-stable trade keys.
- `computeMetrics` produces win rates, profit factor, expectancy, streaks, drawdown and recovery, R multiples, profit concentration.
- `computeEdgeScore` is the versioned 0 to 100 composite; the formula lives in [docs/edge-score.md](../../docs/edge-score.md).
- `calendarMonth`, `dailyStats`, `dailyCumulative`, `equityCurve`, `intradayCurve` feed the calendar and every chart. Day bucketing is timezone-aware and DST-safe.

Fully unit-tested. Private and proprietary.
