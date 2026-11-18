# Trading Bauhaus journal importers

Private workspace package for broker statements and journal exports. It has no runtime dependencies beyond Trading Bauhaus' internal journal-core package, runs in Node and the browser, and is not published to npm.

## What it does

Turns broker and journal exports into normalized executions, ready for `buildRoundTrips`.

```ts
import {
  parseAuto,
  parseWithMapping,
  readHeaders,
  FORMATS,
} from "@trading-bauhaus/journal-importers";

const parsed = parseAuto(fileText, { timeZone: "America/New_York" });
// -> { format, executions, warnings, skippedRows } or null when unrecognized
```

- Auto-detects 12 formats: TradeZella and Tradervue (one-click migration), TradingView, MetaTrader 4 statements, ThinkorSwim / Schwab, Interactive Brokers (activity CSV + Flex Query), NinjaTrader, Tradovate, TopstepX, Webull, DAS Trader.
- `parseWithMapping` handles any other CSV through a user-defined column mapping; nothing is guessed silently.
- Handles quoted fields, BOM, `;` and tab delimiters, `$1,234.56` and `(45.20)` numbers, European decimals, timezone suffixes, and DST-safe naive-timestamp conversion.
- TradeZella imports reconcile stated net P&L to the cent, so migrated history matches the trader's old numbers.

Per-format validation status lives in [docs/importers.md](docs/importers.md). Private and proprietary.
