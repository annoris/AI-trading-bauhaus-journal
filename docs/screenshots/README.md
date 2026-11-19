# Trading Bauhaus Screenshot Suite

This directory contains the 8 automated live-rendered screenshots of **Trading Bauhaus — Interactive Showcase & Journal Terminal** (`site/`), captured over headless Google Chrome DevTools Protocol (CDP) by [`scripts/capture-screenshots.mjs`](../../scripts/capture-screenshots.mjs).

All figures visible across these screens come from the deterministic, fictional **NQ / MNQ Prop Evaluation** sample dataset (51 closed futures round-trip trades across October–November 2026) running entirely client-side with zero external brokerage connections or real capital.

## Captured Screenshots

| File                                                       | Viewport           | Pixel Size | Captured State & Selector                  | Visual Focus                                                                                                                                                                                               |
| :--------------------------------------------------------- | :----------------- | :--------- | :----------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`01-welcome-showcase.png`](01-welcome-showcase.png)       | `1440×900` (`@1x`) | `1440×900` | `#welcome` at scroll `y = 0`               | Dark-first Bauhaus hero showcase, corner coordinates (`PROCESS / 01`, `REVIEW → REFINE`), orbital accents, live computed KPI preview card, SVG equity curve, and Edge Score radar.                         |
| [`02-dashboard-workspace.png`](02-dashboard-workspace.png) | `1440×900` (`@1x`) | `1440×900` | `#workspace` (`#view=dashboard`)           | Read-only demo scope bar, Simulated AI Journal Analyst briefing + prompt chips, 5 KPI cards with Edge Score v2 6-axis radar, cumulative equity curve, and recent executions.                               |
| [`03-trades-explorer.png`](03-trades-explorer.png)         | `1440×900` (`@1x`) | `1440×900` | `#workspace` (`#view=trades`)              | Search, setup dropdown, outcome filters, sortable execution ledger (Date, Symbol, Side, Setup, Mistakes, Duration, Realized R, Net P&L), and per-row `Replay` trigger.                                     |
| [`04-trade-replay-modal.png`](04-trade-replay-modal.png)   | `1440×900` (`@1x`) | `1440×900` | `<dialog id="trade-modal">` open           | Native `<dialog>` candle replay modal showing entry/target/stop reference lines, BUY/SELL markers, bar-by-bar scrubber, simulated unrealized P&L, estimated MAE/MFE, playbook checklist, and review notes. |
| [`05-pnl-calendar.png`](05-pnl-calendar.png)               | `1440×900` (`@1x`) | `1440×900` | `#workspace` (`#view=calendar`, `2026-10`) | Monthly Sun–Sat + Week summary heatmap with monthly performance insights and live Selected Session Inspector drilldown below the calendar grid.                                                            |
| [`06-reports-analytics.png`](06-reports-analytics.png)     | `1440×900` (`@1x`) | `1440×900` | `#workspace` (`#view=reports`)             | Seven statistical KPIs (Net P&L, Expectancy, Profit Factor, Sharpe, SQN, Max Drawdown, Recovery Factor), full-width equity curve, and zero-anchored daily net P&L bar chart.                               |
| [`07-journal-prop-firms.png`](07-journal-prop-firms.png)   | `1440×900` (`@1x`) | `1440×900` | `#workspace` (`#view=journal`)             | Session selector list, structured Pre-Market Plan / Execution Review / Lesson blocks, clickable session trades, and the 6-rule NQ / MNQ Discipline Playbook with live adherence bars.                      |
| [`08-mobile-responsive.png`](08-mobile-responsive.png)     | `390×844` (`@2x`)  | `780×1688` | Mobile reload at `#view=dashboard`         | Compact mobile header, scrollable workspace view switcher, full-width dark KPI & AI review cards, and verified zero horizontal overflow (`scrollWidth <= innerWidth`).                                     |

## Automated Smoke Checks During Capture

Running `pnpm screenshots` also asserts live DOM and runtime behavior in headless Chrome:

1. **Hero & Dashboard Scope:** Asserts live hero KPIs + Edge Score radar render and timeframe filtering (`30D` ↔ `All`) dynamically updates the workspace scope pill.
2. **Trades & Candle Replay Flow:** Asserts `>= 10` rendered trade rows, opens `<dialog id="trade-modal">` with OHLC SVG candlesticks, advances replay steps via `#replay-restart-btn` and `#replay-step-btn`, and verifies `Escape` closes the dialog cleanly.
3. **Calendar, Reports & Prop Ledger:** Verifies active monthly calendar cells + Session Inspector, toggles Reports subtabs (`Overview`, `Setups & Mistakes`, `Trade Explorer` scatter SVG), and confirms fictional Prop Firms cash-ledger rows render.
4. **Privacy Mask & Theme Toggles:** Verifies `#privacy-toggle` masks dollar figures to `$••••`, `#theme-toggle` switches cleanly between `dark` and `light`, and mobile `390×844` reload keeps `#mobile-nav` closed with zero horizontal overflow.
5. **Zero Runtime Errors:** Fails on any `Runtime.exceptionThrown` or `console.error` event across the session.

## Regenerating Screenshots

Ensure **Node.js 22+** and **Google Chrome** are installed (override the binary path with `CHROME_PATH` if not located at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`):

```bash
pnpm screenshots
```
