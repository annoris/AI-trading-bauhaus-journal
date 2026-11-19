# Architecture and Improvement Priorities

## Technology decision

Keep TypeScript and the existing module separation. Rewriting to Python, Go, or Rust without measuring an actual bottleneck would introduce migration overhead and risk altering financial calculations. No performance benchmark has been established yet for this installation.

- `packages/core/src`: pure calculations, models, filters, and metrics. Do not import React, SQLite, or external services here.
- `packages/importers/src`: broker file translation into executions; preserve source data and warnings.
- `apps/web/src/server`: queries, persistence, configuration, and providers.
- `apps/web/src/app/api`: request validation and domain/persistence coordination.
- `apps/web/src/lib`: UI utilities and independent transformations.
- `apps/web/src/components`: reusable UI components.
- `apps/web/tests` and `packages/*/tests`: calculation and integration regressions.

## First improvement applied

The trade list exposes net result in R and strategy name. The column selector lets users inspect planned risk and mistake tags. It reuses `tradeRisk` and `tradeR` from the existing calculation engine: it neither duplicates formulas nor alters stored trades.

Planned risk uses the weighted average entry price, stop loss, and total entry quantity; derivatives require a contract multiplier. It does not represent maximum simultaneous exposure or reconstruct the original stop if it was edited later. R is unavailable without valid risk or for open positions. Strategy names are resolved in a batched query without issuing an extra query per trade.

## Next priorities

1. **Accuracy and reconciliation:** Compare imports against anonymized real statements from supported brokers; verify fees, partial fills, reversals, contract multipliers, and timezones.
2. **Review workflow:** Streamline review by strategy, mistakes, and rule adherence; keep open positions separate from closed trade results.
3. **Initial risk persistence:** Record risk at entry along with its change history before presenting R as an immutable original-risk figure.
4. **Measured performance:** Profile latency and memory with 10,000 and 100,000 trades; consider server-side pagination and pre-computed aggregations before changing languages. Today the table paginates in the browser while the API returns all matching rows.
5. **Recovery and restore:** Manual encrypted backup/restore commands are already implemented and verified with `pnpm verify:backup`; configuring off-host retention and rehearsing a full restore in staging remain pending. The existing JSON export remains account-scoped and is not a full operational backup.
6. **Spanish localization:** Introduce centralized translation tables and locale-aware formatting by configuration, avoiding ad-hoc inline string translations.

These priorities are technical proposals, not the result of a user survey. Functional references: [Tradervue: R-multiple risk reporting](https://www.tradervue.com/help/reports/risk_reporting) and [TradeZella: strategy and mistake tag analysis](https://help.tradezella.com/en/articles/7190691-analyzing-tags).

## Validation

Run from the repository root: `pnpm test`, `pnpm typecheck`, `pnpm build`, and `pnpm pages:check`. Check formatting with Prettier on modified files (`pnpm format:check`). Keep the `pnpm` version pinned in `package.json` for reproducible installs, and back up your data directory before making broader changes.
