import {
  answerAiPrompt,
  buildCalendarMonth,
  computeAiBriefing,
  computeBreakdownBySetup,
  computeEdgeScore,
  computeMetrics,
  computeMistakeImpact,
  computePropSummary,
  computeRuleAdherence,
  filterTrades,
  generateDemoDataset,
} from "./demo-data.js";
import {
  formatMoney,
  formatShortDate,
  renderCandlestickSVG,
  renderDailyBarsSVG,
  renderEdgeRadarSVG,
  renderEquityCurveSVG,
  renderScatterSVG,
  renderWinRateGaugeSVG,
} from "./charts.js";

const VALID_VIEWS = new Set([
  "dashboard",
  "trades",
  "calendar",
  "reports",
  "journal",
  "prop-firms",
]);

const dataset = generateDemoDataset();
const tradesById = new Map(dataset.trades.map((t) => [t.id, t]));
const journalByDate = new Map(dataset.journalDays.map((d) => [d.date, d]));

const state = {
  appMode: "showcase",
  theme: "dark",
  privacyMode: false,
  activeView: "dashboard",
  range: "all",
  symbol: "ALL",
  aiPrompt: "best-setup",
  tradesSearch: "",
  tradesSetup: "ALL",
  tradesOutcome: "all",
  tradesSortKey: "date",
  tradesSortDir: "desc",
  calendarMonth: "2026-11",
  selectedCalDate: null,
  reportsTab: "overview",
  scatterMetric: "pnl",
  selectedJournalDate: dataset.journalDays.at(-1)?.date ?? null,
  propFilter: "all",
  modalTradeId: null,
  replayBarCount: 24,
  replayTimer: null,
  lastModalTrigger: null,
  lastMenuTrigger: null,
};

const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const money = (value, opts = {}) => formatMoney(value, state.privacyMode, opts);
const maskCurrency = (value) => money(value, { signed: false });

function formatDuration(minutes) {
  if (!Number.isFinite(minutes)) return "—";
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded}m`;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatR(r) {
  if (r === null || r === undefined || Number.isNaN(r)) return "—";
  return `${r >= 0 ? "+" : ""}${r.toFixed(2)}R`;
}

function formatPF(metrics) {
  if (metrics.profitFactorIsInfinite) return "∞";
  if (metrics.profitFactor === null) return "—";
  return metrics.profitFactor.toFixed(2);
}

function getScopedTrades() {
  return filterTrades(dataset.trades, {
    range: state.range,
    symbol: state.symbol,
  });
}

function getFilteredExplorerTrades(scoped) {
  const query = state.tradesSearch.trim().toLowerCase();
  const filtered = scoped.filter((t) => {
    if (state.tradesSetup !== "ALL" && t.setup !== state.tradesSetup) return false;
    if (state.tradesOutcome === "win" && t.netPnl <= 0) return false;
    if (state.tradesOutcome === "loss" && t.netPnl >= 0) return false;
    if (query) {
      const hay = [t.id, t.symbol, t.direction, t.setup, ...t.mistakes, ...t.tags]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  const dir = state.tradesSortDir === "asc" ? 1 : -1;
  return [...filtered].sort((a, b) => {
    switch (state.tradesSortKey) {
      case "symbol":
        return (
          (a.symbol.localeCompare(b.symbol) || Date.parse(a.closedAt) - Date.parse(b.closedAt)) *
          dir
        );
      case "duration":
        return (a.durationMinutes - b.durationMinutes) * dir;
      case "realizedR":
        return ((a.realizedR ?? 0) - (b.realizedR ?? 0)) * dir;
      case "netPnl":
        return (a.netPnl - b.netPnl) * dir;
      case "date":
      default:
        return (Date.parse(a.closedAt) - Date.parse(b.closedAt)) * dir;
    }
  });
}

/* ---------- Theme & Privacy Controls ---------- */

function syncThemeControls() {
  document.documentElement.dataset.theme = state.theme;
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", state.theme === "dark" ? "#090b0b" : "#f9f9f7");
  }
  const isLight = state.theme === "light";
  const desktopBtn = document.getElementById("theme-toggle");
  const desktopLabel = document.getElementById("theme-toggle-label");
  const mobileBtn = document.getElementById("mobile-theme-toggle");

  if (desktopBtn) desktopBtn.setAttribute("aria-pressed", String(isLight));
  if (desktopLabel) desktopLabel.textContent = isLight ? "Dark" : "Light";
  if (mobileBtn) {
    mobileBtn.setAttribute("aria-pressed", String(isLight));
    mobileBtn.textContent = isLight
      ? "Switch Theme (Currently Light)"
      : "Switch Theme (Currently Dark)";
  }
}

function syncPrivacyControls() {
  const active = state.privacyMode;
  const desktopBtn = document.getElementById("privacy-toggle");
  const desktopLabel = document.getElementById("privacy-toggle-label");
  const mobileBtn = document.getElementById("mobile-privacy-toggle");

  if (desktopBtn) desktopBtn.setAttribute("aria-pressed", String(active));
  if (desktopLabel) desktopLabel.textContent = active ? "Masked" : "Privacy";
  if (mobileBtn) {
    mobileBtn.setAttribute("aria-pressed", String(active));
    mobileBtn.textContent = active ? "Privacy Mask Active ($••••)" : "Toggle Privacy Mask ($••••)";
  }

  for (const el of document.querySelectorAll("[data-maskable]")) {
    const raw = Number(el.getAttribute("data-maskable"));
    if (Number.isFinite(raw)) {
      el.textContent = maskCurrency(raw);
    }
  }
}

/* ---------- Hero Preview ---------- */

function renderHeroPreview() {
  const container = document.getElementById("hero-preview-body");
  if (!container) return;

  const metrics = computeMetrics(dataset.trades);
  const edge = computeEdgeScore(metrics);
  const winPct = metrics.winRate !== null ? `${(metrics.winRate * 100).toFixed(1)}%` : "—";

  container.innerHTML = `
    <div class="preview-kpi-row">
      <div class="preview-kpi">
        <span class="preview-kpi-label">Net P&amp;L</span>
        <strong class="preview-kpi-val tabular-nums ${metrics.netPnl >= 0 ? "tone-profit" : "tone-loss"}">
          ${esc(money(metrics.netPnl))}
        </strong>
      </div>
      <div class="preview-kpi">
        <span class="preview-kpi-label">Win Rate</span>
        <strong class="preview-kpi-val tabular-nums">${esc(winPct)}</strong>
      </div>
      <div class="preview-kpi">
        <span class="preview-kpi-label">Edge Score</span>
        <strong class="preview-kpi-val tabular-nums tone-profit">
          ${edge.score !== null ? esc(edge.score.toFixed(1)) : "—"}<span style="font-size:11px;color:var(--muted)">/100</span>
        </strong>
      </div>
    </div>
    <div class="preview-charts-split">
      <div class="preview-chart-box">
        <div class="preview-chart-title">
          <span>Equity Curve</span>
          <span class="tabular-nums">${metrics.closedTrades} trades</span>
        </div>
        ${renderEquityCurveSVG(metrics.curve, {
          privacyMode: state.privacyMode,
          height: 155,
          width: 340,
          compact: true,
          interactive: false,
          uid: "hero-eq",
        })}
      </div>
      <div class="preview-chart-box">
        <div class="preview-chart-title">
          <span>Edge Radar</span>
          <span class="tabular-nums">PF ${esc(formatPF(metrics))}</span>
        </div>
        ${renderEdgeRadarSVG(edge.components, { compact: true })}
      </div>
    </div>
  `;
}

/* ---------- Scope Banner & Filter Chips ---------- */

function renderScopeHeader(scoped) {
  const pill = document.getElementById("workspace-scope-pill");
  const rangeLabel = state.range === "all" ? "All" : state.range.toUpperCase();
  const symLabel = state.symbol === "ALL" ? "All Symbols" : state.symbol;
  if (pill) {
    pill.textContent = `${scoped.length} trade${scoped.length === 1 ? "" : "s"} · ${rangeLabel} · ${symLabel}`;
  }

  for (const btn of document.querySelectorAll("#dash-range-filters [data-range]")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.range === state.range));
  }
  for (const btn of document.querySelectorAll("#dash-symbol-filters [data-symbol]")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.symbol === state.symbol));
  }
}

/* ---------- View A: Dashboard ---------- */

function renderDashboard(scoped) {
  const metrics = computeMetrics(scoped);
  const edge = computeEdgeScore(metrics);
  const briefing = computeAiBriefing(scoped, metrics, edge);
  const answer = answerAiPrompt(state.aiPrompt, scoped, metrics, edge, (val) => money(val));

  const briefingEl = document.getElementById("ai-briefing-grid");
  if (briefingEl) {
    briefingEl.innerHTML = `
      <div class="ai-briefing-item">
        <strong>Performance Read</strong>
        <p>${esc(state.privacyMode ? "Monetary totals masked by Privacy Mode; win rate and ratios remain visible." : briefing.performanceRead)}</p>
      </div>
      <div class="ai-briefing-item">
        <strong>Setup Pattern</strong>
        <p>${esc(state.privacyMode ? "Opening range pullback leads filtered setup expectancy." : briefing.setupPattern)}</p>
      </div>
      <div class="ai-briefing-item">
        <strong>Risk and Execution</strong>
        <p>${esc(state.privacyMode ? "Sample evaluation rules preserve a $•••• trailing drawdown buffer." : briefing.riskExecution)}</p>
      </div>
      <div class="ai-briefing-item">
        <strong>Next Review</strong>
        <p>${esc(state.privacyMode ? "Review tagged execution notes before next NY 09:30 open." : briefing.nextReview)}</p>
      </div>
    `;
  }

  for (const chip of document.querySelectorAll("#ai-prompt-chips [data-ai-prompt]")) {
    chip.setAttribute("aria-pressed", String(chip.dataset.aiPrompt === state.aiPrompt));
  }

  const answerEl = document.getElementById("ai-prompt-answer");
  if (answerEl) {
    answerEl.innerHTML = `
      <h4>${esc(answer.title)}</h4>
      <p>${esc(answer.body)}</p>
      <div class="ai-citations">
        ${answer.citations.map((c) => `<span class="ai-citation-tag">${esc(c)}</span>`).join("")}
      </div>
    `;
  }

  const kpiGrid = document.getElementById("dash-kpi-grid");
  if (kpiGrid) {
    const avgWin = metrics.avgWin ?? 0;
    const avgLoss = metrics.avgLoss ?? 0;
    const avgTotal = avgWin + avgLoss || 1;
    const winBarPct = Math.round((avgWin / avgTotal) * 100);
    const lossBarPct = 100 - winBarPct;

    kpiGrid.innerHTML = `
      <article class="kpi-card">
        <div class="kpi-label"><span>Net P&amp;L</span></div>
        <div class="kpi-value tabular-nums ${metrics.netPnl >= 0 ? "tone-profit" : "tone-loss"}">
          ${esc(money(metrics.netPnl))}
        </div>
        <div class="kpi-sub tabular-nums">
          ${metrics.closedTrades} closed · ${esc(money(metrics.fees, { signed: false }))} fees
        </div>
      </article>

      <article class="kpi-card">
        <div class="kpi-label">
          <span>Trade Win %</span>
          <span class="tabular-nums">${metrics.wins}W / ${metrics.losses}L</span>
        </div>
        ${renderWinRateGaugeSVG(metrics.winRate)}
        <div class="kpi-sub tabular-nums" style="text-align:center;">
          ${metrics.dayWinRate !== null ? `${(metrics.dayWinRate * 100).toFixed(1)}% green days (${metrics.tradingDays}d)` : "No trading days"}
        </div>
      </article>

      <article class="kpi-card">
        <div class="kpi-label"><span>Profit Factor</span></div>
        <div class="kpi-value tabular-nums">${esc(formatPF(metrics))}</div>
        <div class="kpi-sub tabular-nums">
          ${esc(money(metrics.grossProfit, { signed: false }))} gross win / ${esc(money(metrics.grossLoss, { signed: false }))} gross loss
        </div>
      </article>

      <article class="kpi-card">
        <div class="kpi-label"><span>Avg Win / Loss</span></div>
        <div class="kpi-value tabular-nums">
          ${metrics.avgWinLossRatio !== null ? metrics.avgWinLossRatio.toFixed(2) : "—"}
        </div>
        <div class="ratio-bar" aria-hidden="true">
          <div class="ratio-bar-win" style="width:${winBarPct}%"></div>
          <div class="ratio-bar-loss" style="width:${lossBarPct}%"></div>
        </div>
        <div class="kpi-sub tabular-nums">
          <span class="tone-profit">${esc(money(avgWin))}</span> avg ·
          <span class="tone-loss">${esc(money(-avgLoss))}</span> avg
        </div>
      </article>

      <article class="kpi-card kpi-card-radar">
        <div class="kpi-label">
          <span>Edge Score v2</span>
          <strong class="tabular-nums tone-profit">${edge.score !== null ? `${edge.score.toFixed(1)}/100` : "—"}</strong>
        </div>
        ${renderEdgeRadarSVG(edge.components, { compact: false })}
        <div class="kpi-sub tabular-nums">
          Max DD ${esc(money(metrics.maxDrawdown, { signed: false }))} · Avg R ${esc(formatR(metrics.avgRealizedR))}
        </div>
      </article>
    `;
  }

  const equityHost = document.getElementById("dash-equity-chart");
  const equityReadout = document.getElementById("dash-equity-readout");
  if (equityHost) {
    equityHost.innerHTML = renderEquityCurveSVG(metrics.curve, {
      privacyMode: state.privacyMode,
      height: 245,
      width: 680,
      uid: "dash-eq",
    });
    if (equityReadout) {
      const last = metrics.curve.at(-1);
      equityReadout.textContent = last
        ? `Cumulative: ${money(last.cumNetPnl)} across ${metrics.curve.length} trades`
        : "No closed trades";
    }
    bindEquityHover(equityHost, equityReadout, metrics.curve);
  }

  const recentHost = document.getElementById("dash-recent-trades");
  if (recentHost) {
    const recent = [...scoped].reverse().slice(0, 6);
    recentHost.innerHTML = recent.length
      ? recent
          .map(
            (t) => `
          <button type="button" class="recent-row" data-open-trade="${esc(t.id)}">
            <div class="recent-left">
              <div class="recent-top">
                <span>${esc(t.symbol)}</span>
                <span class="badge ${t.direction === "long" ? "badge-long" : "badge-short"}">${esc(t.direction)}</span>
                <span class="tabular-nums" style="color:var(--muted);font-weight:500;font-size:12px;">${esc(t.dateKey)}</span>
              </div>
              <span class="recent-setup">${esc(t.setup)} · ${esc(formatDuration(t.durationMinutes))}</span>
            </div>
            <div class="recent-right tabular-nums">
              <span class="recent-pnl ${t.netPnl >= 0 ? "tone-profit" : "tone-loss"}">${esc(money(t.netPnl))}</span>
              <span class="recent-r">${esc(formatR(t.realizedR))}</span>
            </div>
          </button>
        `,
          )
          .join("")
      : `<div class="chart-empty">No trades match this filter.</div>`;
  }
}

function bindEquityHover(container, readoutEl, curve) {
  if (!container || !readoutEl || !curve.length) return;
  const byIdx = new Map(curve.map((pt) => [String(pt.index), pt]));
  for (const node of container.querySelectorAll("[data-equity-idx]")) {
    const pt = byIdx.get(node.getAttribute("data-equity-idx"));
    if (!pt) continue;
    const update = () => {
      readoutEl.textContent = `#${pt.index} · ${pt.date} · ${pt.symbol} ${money(pt.pnl)} (Cum ${money(pt.cumNetPnl)})`;
    };
    node.addEventListener("mouseenter", update);
    node.addEventListener("click", () => {
      if (pt.id) openTradeModal(pt.id, node);
    });
  }
}

/* ---------- View B: Trades Explorer ---------- */

function renderTradesView(scoped) {
  const rows = getFilteredExplorerTrades(scoped);
  const metrics = computeMetrics(rows);

  for (const chip of document.querySelectorAll("#trades-outcome-filters [data-outcome]")) {
    chip.setAttribute("aria-pressed", String(chip.dataset.outcome === state.tradesOutcome));
  }

  for (const btn of document.querySelectorAll("[data-sort]")) {
    if (btn.dataset.sort === state.tradesSortKey) {
      btn.setAttribute("aria-sort", state.tradesSortDir === "asc" ? "ascending" : "descending");
    } else {
      btn.removeAttribute("aria-sort");
    }
  }

  const strip = document.getElementById("trades-summary-strip");
  if (strip) {
    strip.innerHTML = `
      <div class="summary-mini">
        <span>Matching Trades</span>
        <strong class="tabular-nums">${metrics.closedTrades}</strong>
      </div>
      <div class="summary-mini">
        <span>Net P&amp;L</span>
        <strong class="tabular-nums ${metrics.netPnl >= 0 ? "tone-profit" : "tone-loss"}">${esc(money(metrics.netPnl))}</strong>
      </div>
      <div class="summary-mini">
        <span>Win Rate</span>
        <strong class="tabular-nums">${metrics.winRate !== null ? `${(metrics.winRate * 100).toFixed(1)}%` : "—"}</strong>
      </div>
      <div class="summary-mini">
        <span>Avg Realized R</span>
        <strong class="tabular-nums">${esc(formatR(metrics.avgRealizedR))}</strong>
      </div>
    `;
  }

  const tbody = document.getElementById("trades-table-body");
  if (tbody) {
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="9"><div class="chart-empty">No trades match your search or outcome filters.</div></td></tr>`;
      return;
    }
    tbody.innerHTML = rows
      .map((t) => {
        const mistakeBadges = t.mistakes.length
          ? t.mistakes.map((m) => `<span class="badge badge-mistake">${esc(m)}</span>`).join(" ")
          : `<span class="badge badge-neutral">clean</span>`;
        return `
          <tr>
            <td class="tabular-nums">${esc(t.dateKey)}<br /><span style="color:var(--dim);font-size:11px;">${esc(t.entryTime)}–${esc(t.exitTime)}</span></td>
            <td><strong>${esc(t.symbol)}</strong><br /><span style="color:var(--dim);font-size:11px;">${t.quantity} ct</span></td>
            <td><span class="badge ${t.direction === "long" ? "badge-long" : "badge-short"}">${esc(t.direction)}</span></td>
            <td>${esc(t.setup)}</td>
            <td>${mistakeBadges}</td>
            <td class="tabular-nums">${esc(formatDuration(t.durationMinutes))}</td>
            <td class="tabular-nums ${t.realizedR >= 0 ? "tone-profit" : "tone-loss"}">${esc(formatR(t.realizedR))}</td>
            <td class="tabular-nums"><strong class="${t.netPnl >= 0 ? "tone-profit" : "tone-loss"}">${esc(money(t.netPnl))}</strong></td>
            <td>
              <button type="button" class="replay-btn" data-open-trade="${esc(t.id)}">Replay</button>
            </td>
          </tr>
        `;
      })
      .join("");
  }
}

/* ---------- View C: P&L Calendar ---------- */

function renderCalendarView(scoped) {
  const [yr, mo] = state.calendarMonth.split("-").map(Number);
  const cal = buildCalendarMonth(scoped, yr, mo);

  for (const btn of document.querySelectorAll("#cal-month-tabs [data-month]")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.month === state.calendarMonth));
  }

  if (!state.selectedCalDate || !state.selectedCalDate.startsWith(state.calendarMonth)) {
    state.selectedCalDate = cal.activeDays.at(-1)?.date ?? null;
  }

  const strip = document.getElementById("cal-insights-strip");
  if (strip) {
    const ins = cal.insights;
    strip.innerHTML = `
      <div class="summary-mini">
        <span>Month Net P&amp;L</span>
        <strong class="tabular-nums ${ins.netPnl >= 0 ? "tone-profit" : "tone-loss"}">${esc(money(ins.netPnl))}</strong>
      </div>
      <div class="summary-mini">
        <span>Trading Days</span>
        <strong class="tabular-nums">${ins.tradingDays} (${ins.greenDays}G / ${ins.redDays}R)</strong>
      </div>
      <div class="summary-mini">
        <span>Trade Win Rate</span>
        <strong class="tabular-nums">${ins.winRate !== null ? `${(ins.winRate * 100).toFixed(1)}%` : "—"}</strong>
      </div>
      <div class="summary-mini">
        <span>Best Session</span>
        <strong class="tabular-nums tone-profit">${ins.bestDay ? `${formatShortDate(ins.bestDay.date)} (${money(ins.bestDay.netPnl)})` : "—"}</strong>
      </div>
      <div class="summary-mini">
        <span>Top Weekday</span>
        <strong class="tabular-nums">${ins.topWeekday ? `${ins.topWeekday.label} (${money(ins.topWeekday.netPnl)})` : "—"}</strong>
      </div>
    `;
  }

  const grid = document.getElementById("cal-grid");
  if (grid) {
    const headers = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Week"]
      .map((h) => `<div class="cal-head-cell">${h}</div>`)
      .join("");

    const cells = cal.weeks
      .map((week, wIdx) => {
        const dayCells = week.days
          .map((cell) => {
            if (!cell) {
              return `<div class="cal-day-cell cal-day-empty" aria-hidden="true"></div>`;
            }
            if (!cell.stat) {
              return `
                <div class="cal-day-cell">
                  <span class="cal-day-num tabular-nums">${cell.dayNum}</span>
                </div>
              `;
            }
            const isWin = cell.stat.netPnl >= 0;
            const isSelected = state.selectedCalDate === cell.date;
            return `
              <button
                type="button"
                class="cal-day-cell cal-day-active ${isWin ? "is-win" : "is-loss"}"
                data-cal-date="${esc(cell.date)}"
                aria-pressed="${String(isSelected)}"
              >
                <span class="cal-day-num tabular-nums">${cell.dayNum}</span>
                <span class="cal-day-pnl tabular-nums ${isWin ? "tone-profit" : "tone-loss"}">${esc(money(cell.stat.netPnl))}</span>
                <span class="cal-day-count tabular-nums">${cell.stat.trades} trade${cell.stat.trades === 1 ? "" : "s"}</span>
              </button>
            `;
          })
          .join("");

        const weekCell = `
          <div class="cal-week-cell">
            <span class="cal-week-label">W${wIdx + 1}</span>
            <strong class="cal-day-pnl tabular-nums ${week.netPnl >= 0 ? "tone-profit" : "tone-loss"}">
              ${week.trades ? esc(money(week.netPnl)) : "—"}
            </strong>
            <span class="cal-day-count tabular-nums">${week.trades} tr</span>
          </div>
        `;
        return dayCells + weekCell;
      })
      .join("");

    grid.innerHTML = headers + cells;
  }

  renderCalendarDayInspector(scoped);
}

function renderCalendarDayInspector(scoped) {
  const inspector = document.getElementById("cal-day-inspector");
  if (!inspector) return;

  if (!state.selectedCalDate) {
    inspector.innerHTML = `<div class="chart-empty">No trading sessions recorded in this month for the active filter.</div>`;
    return;
  }

  const dayTrades = scoped.filter((t) => t.dateKey === state.selectedCalDate);
  const journal = journalByDate.get(state.selectedCalDate);
  const dayNet = dayTrades.reduce((s, t) => s + t.netPnl, 0);

  inspector.innerHTML = `
    <div class="panel-head">
      <h3>Session Inspector · ${esc(state.selectedCalDate)}</h3>
      <span class="panel-readout tabular-nums ${dayNet >= 0 ? "tone-profit" : "tone-loss"}">
        ${dayTrades.length} trade${dayTrades.length === 1 ? "" : "s"} · ${esc(money(dayNet))}
      </span>
    </div>
    <div class="day-inspector-grid">
      <div class="recent-list">
        ${
          dayTrades.length
            ? dayTrades
                .map(
                  (t) => `
              <button type="button" class="recent-row" data-open-trade="${esc(t.id)}">
                <div class="recent-left">
                  <div class="recent-top">
                    <span>${esc(t.symbol)}</span>
                    <span class="badge ${t.direction === "long" ? "badge-long" : "badge-short"}">${esc(t.direction)}</span>
                    <span class="tabular-nums" style="font-size:11.5px;color:var(--muted);">${esc(t.entryTime)}</span>
                  </div>
                  <span class="recent-setup">${esc(t.setup)} · Click to open candle replay</span>
                </div>
                <div class="recent-right tabular-nums">
                  <span class="recent-pnl ${t.netPnl >= 0 ? "tone-profit" : "tone-loss"}">${esc(money(t.netPnl))}</span>
                  <span class="recent-r">${esc(formatR(t.realizedR))}</span>
                </div>
              </button>
            `,
                )
                .join("")
            : `<div class="chart-empty">No matching trades for this symbol filter on ${esc(state.selectedCalDate)}.</div>`
        }
      </div>
      <div class="journal-note-block">
        <strong>Session Reflection</strong>
        <p style="margin-bottom:8px;">${esc(journal?.execution ?? "Session notes recorded in daily journal.")}</p>
        <strong>Lesson Carried Forward</strong>
        <p>${esc(journal?.lesson ?? "Verify bias and planned stop sizing before entry.")}</p>
      </div>
    </div>
  `;
}

/* ---------- View D: Reports & Analytics ---------- */

function renderReportsView(scoped) {
  const metrics = computeMetrics(scoped);

  for (const btn of document.querySelectorAll("#reports-subtabs [data-report-tab]")) {
    const active = btn.dataset.reportTab === state.reportsTab;
    btn.setAttribute("aria-selected", String(active));
  }

  const panels = {
    overview: document.getElementById("reports-panel-overview"),
    setups: document.getElementById("reports-panel-setups"),
    explorer: document.getElementById("reports-panel-explorer"),
  };
  for (const [key, panel] of Object.entries(panels)) {
    if (panel) panel.hidden = key !== state.reportsTab;
  }

  const kpi7 = document.getElementById("reports-kpi-grid");
  if (kpi7) {
    kpi7.innerHTML = `
      <div class="summary-mini">
        <span>Net P&amp;L</span>
        <strong class="tabular-nums ${metrics.netPnl >= 0 ? "tone-profit" : "tone-loss"}">${esc(money(metrics.netPnl))}</strong>
      </div>
      <div class="summary-mini">
        <span>Expectancy</span>
        <strong class="tabular-nums">${metrics.expectancy !== null ? esc(money(metrics.expectancy)) : "—"}</strong>
      </div>
      <div class="summary-mini">
        <span>Profit Factor</span>
        <strong class="tabular-nums">${esc(formatPF(metrics))}</strong>
      </div>
      <div class="summary-mini">
        <span>Sharpe (Ann.)</span>
        <strong class="tabular-nums">${metrics.sharpeRatio !== null ? metrics.sharpeRatio.toFixed(2) : "—"}</strong>
      </div>
      <div class="summary-mini">
        <span>SQN</span>
        <strong class="tabular-nums">${metrics.sqn !== null ? metrics.sqn.toFixed(2) : "—"}</strong>
      </div>
      <div class="summary-mini">
        <span>Max Drawdown</span>
        <strong class="tabular-nums tone-loss">${esc(money(-metrics.maxDrawdown))}</strong>
      </div>
      <div class="summary-mini">
        <span>Recovery Factor</span>
        <strong class="tabular-nums">${metrics.recoveryFactor !== null ? metrics.recoveryFactor.toFixed(2) : "—"}</strong>
      </div>
    `;
  }

  const eqHost = document.getElementById("reports-equity-chart");
  const eqReadout = document.getElementById("reports-eq-readout");
  if (eqHost) {
    eqHost.innerHTML = renderEquityCurveSVG(metrics.curve, {
      privacyMode: state.privacyMode,
      height: 240,
      width: 760,
      uid: "rep-eq",
    });
    if (eqReadout) {
      eqReadout.textContent = metrics.curve.length
        ? `End equity: ${money(metrics.curve.at(-1).cumNetPnl)} (${metrics.curve.length} trades)`
        : "No closed trades";
    }
    bindEquityHover(eqHost, eqReadout, metrics.curve);
  }

  const barsHost = document.getElementById("reports-daily-bars");
  const barReadout = document.getElementById("reports-bar-readout");
  if (barsHost) {
    barsHost.innerHTML = renderDailyBarsSVG(metrics.days, state.privacyMode);
    if (barReadout) {
      for (const rect of barsHost.querySelectorAll("[data-bar-date]")) {
        rect.addEventListener("mouseenter", () => {
          const d = rect.getAttribute("data-bar-date");
          const p = Number(rect.getAttribute("data-bar-pnl"));
          const n = rect.getAttribute("data-bar-trades");
          barReadout.textContent = `${d} · ${money(p)} across ${n} trade${n === "1" ? "" : "s"}`;
        });
      }
    }
  }

  const setupBody = document.getElementById("reports-setup-table");
  if (setupBody) {
    const breakdown = computeBreakdownBySetup(scoped);
    setupBody.innerHTML = breakdown
      .map((s) => {
        const pf = s.profitFactorIsInfinite
          ? "∞"
          : s.profitFactor !== null
            ? s.profitFactor.toFixed(2)
            : "—";
        const wr = s.winRate !== null ? `${(s.winRate * 100).toFixed(1)}%` : "—";
        return `
          <tr>
            <td><strong>${esc(s.setup)}</strong><br /><span style="color:var(--dim);font-size:11px;">${esc(s.tag)}</span></td>
            <td class="tabular-nums">${s.trades} (${s.wins}W / ${s.losses}L)</td>
            <td class="tabular-nums">${esc(wr)}</td>
            <td class="tabular-nums">${esc(pf)}</td>
            <td class="tabular-nums">${esc(formatR(s.avgR))}</td>
            <td class="tabular-nums"><strong class="${s.netPnl >= 0 ? "tone-profit" : "tone-loss"}">${esc(money(s.netPnl))}</strong></td>
          </tr>
        `;
      })
      .join("");
  }

  const mistakeHost = document.getElementById("reports-mistake-cards");
  if (mistakeHost) {
    const mistakes = computeMistakeImpact(scoped);
    mistakeHost.innerHTML = mistakes
      .map(
        (m) => `
        <article class="mistake-card">
          <div class="panel-head">
            <span class="badge badge-mistake">${esc(m.label)}</span>
            <span class="tabular-nums" style="font-size:12px;color:var(--muted);">${m.count} trade${m.count === 1 ? "" : "s"}</span>
          </div>
          <p style="margin:0 0 10px;font-size:13px;color:var(--muted);">${esc(m.description)}</p>
          <div class="sidebar-account-meta" style="margin-bottom:4px;">
            <span>Tagged Net P&amp;L</span>
            <strong class="tabular-nums ${m.netPnl >= 0 ? "tone-profit" : "tone-loss"}">${esc(money(m.netPnl))}</strong>
          </div>
          <div class="sidebar-account-meta">
            <span>Est. Cost / Slippage</span>
            <strong class="tabular-nums tone-warning">${esc(money(-m.opportunityOrSlipCost))}</strong>
          </div>
        </article>
      `,
      )
      .join("");
  }

  for (const btn of document.querySelectorAll("#scatter-metric-toggle [data-scatter-metric]")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.scatterMetric === state.scatterMetric));
  }

  const scatterHost = document.getElementById("reports-scatter-chart");
  const scatterReadout = document.getElementById("reports-scatter-readout");
  if (scatterHost) {
    scatterHost.innerHTML = renderScatterSVG(scoped, state.scatterMetric, state.privacyMode);
    for (const node of scatterHost.querySelectorAll("[data-trade-id]")) {
      const id = node.getAttribute("data-trade-id");
      const t = tradesById.get(id);
      if (!t) continue;
      node.addEventListener("mouseenter", () => {
        if (scatterReadout) {
          scatterReadout.textContent = `${t.id} · ${t.symbol} ${t.direction.toUpperCase()} · ${t.durationMinutes}m · ${money(t.netPnl)} (${formatR(t.realizedR)})`;
        }
      });
      node.addEventListener("click", () => openTradeModal(t.id, node));
      node.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openTradeModal(t.id, node);
        }
      });
    }
  }
}

/* ---------- View E: Daily Journal & Playbooks ---------- */

function renderJournalView(scoped) {
  const sessionList = document.getElementById("journal-session-list");
  const sessionDetail = document.getElementById("journal-session-detail");
  const playbookHost = document.getElementById("playbook-rules-list");

  const visibleDates = new Set(scoped.map((t) => t.dateKey));
  const sessions = dataset.journalDays.filter((s) => visibleDates.has(s.date));
  const displaySessions = sessions.length
    ? [...sessions].reverse()
    : [...dataset.journalDays].reverse();

  if (
    !state.selectedJournalDate ||
    !displaySessions.some((s) => s.date === state.selectedJournalDate)
  ) {
    state.selectedJournalDate = displaySessions[0]?.date ?? null;
  }

  if (sessionList) {
    sessionList.innerHTML = displaySessions
      .map((s) => {
        const active = s.date === state.selectedJournalDate;
        return `
          <button
            type="button"
            class="session-btn"
            data-journal-date="${esc(s.date)}"
            ${active ? 'aria-current="true"' : ""}
          >
            <div>
              <strong class="tabular-nums" style="display:block;font-size:13px;">${esc(s.date)}</strong>
              <span style="font-size:11.5px;color:var(--muted);">${s.tradeCount} trade${s.tradeCount === 1 ? "" : "s"} · ${esc(s.primarySymbol)}</span>
            </div>
            <strong class="tabular-nums ${s.netPnl >= 0 ? "tone-profit" : "tone-loss"}" style="font-size:13px;">
              ${esc(money(s.netPnl))}
            </strong>
          </button>
        `;
      })
      .join("");
  }

  const activeSession = displaySessions.find((s) => s.date === state.selectedJournalDate);
  if (sessionDetail && activeSession) {
    sessionDetail.innerHTML = `
      <div class="panel-head">
        <div>
          <h3>Session Journal · ${esc(activeSession.date)}</h3>
          <span class="panel-readout">${activeSession.wins}W / ${activeSession.losses}L · Focus Rating ${activeSession.focusScore}/5</span>
        </div>
        <strong class="tabular-nums ${activeSession.netPnl >= 0 ? "tone-profit" : "tone-loss"}" style="font-size:16px;">
          ${esc(money(activeSession.netPnl))}
        </strong>
      </div>

      <div class="journal-note-grid">
        <div class="journal-note-block">
          <strong>Pre-Market Plan</strong>
          <p>${esc(activeSession.plan)}</p>
        </div>
        <div class="journal-note-block">
          <strong>Execution Review</strong>
          <p>${esc(activeSession.execution)}</p>
        </div>
        <div class="journal-note-block">
          <strong>Lesson Carried Forward</strong>
          <p>${esc(activeSession.lesson)}</p>
        </div>
      </div>

      <div class="recent-list" style="margin-top:14px;">
        ${activeSession.trades
          .map(
            (t) => `
          <button type="button" class="recent-row" data-open-trade="${esc(t.id)}">
            <div class="recent-left">
              <div class="recent-top">
                <span>${esc(t.symbol)}</span>
                <span class="badge ${t.direction === "long" ? "badge-long" : "badge-short"}">${esc(t.direction)}</span>
                <span class="tabular-nums" style="color:var(--muted);font-size:12px;">${esc(t.entryTime)} → ${esc(t.exitTime)}</span>
              </div>
              <span class="recent-setup">${esc(t.setup)} · Click to replay</span>
            </div>
            <div class="recent-right tabular-nums">
              <span class="recent-pnl ${t.netPnl >= 0 ? "tone-profit" : "tone-loss"}">${esc(money(t.netPnl))}</span>
              <span class="recent-r">${esc(formatR(t.realizedR))}</span>
            </div>
          </button>
        `,
          )
          .join("")}
      </div>
    `;
  }

  if (playbookHost) {
    const rules = computeRuleAdherence(scoped);
    playbookHost.innerHTML = rules
      .map(
        (r) => `
        <div class="playbook-rule-row">
          <div class="playbook-rule-top">
            <span><strong>Rule ${r.index}.</strong> ${esc(r.rule)}</span>
            <strong class="tabular-nums ${r.pct >= 95 ? "tone-profit" : "tone-warning"}">${r.pct.toFixed(1)}%</strong>
          </div>
          <div class="adherence-track" aria-hidden="true">
            <div class="adherence-fill" style="width:${Math.max(4, Math.min(100, r.pct))}%"></div>
          </div>
        </div>
      `,
      )
      .join("");
  }
}

/* ---------- View F: Prop Firms Cash Ledger ---------- */

function renderPropFirmsView() {
  const { accounts, entries } = dataset.propLedger;
  const summary = computePropSummary(dataset.propLedger);

  for (const btn of document.querySelectorAll("#prop-filter-tabs [data-prop-filter]")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.propFilter === state.propFilter));
  }

  const roiStrip = document.getElementById("prop-roi-strip");
  if (roiStrip) {
    const roiText = summary.cashRoi !== null ? `${(summary.cashRoi * 100).toFixed(1)}%` : "—";
    roiStrip.innerHTML = `
      <div class="summary-mini">
        <span>Total Paid (Net Fees)</span>
        <strong class="tabular-nums tone-loss">${esc(money(-summary.netSpend))}</strong>
      </div>
      <div class="summary-mini">
        <span>Fee Refunds</span>
        <strong class="tabular-nums">${esc(money(summary.refunds))}</strong>
      </div>
      <div class="summary-mini">
        <span>Cash Received</span>
        <strong class="tabular-nums tone-profit">${esc(money(summary.received))}</strong>
      </div>
      <div class="summary-mini">
        <span>Net Cash Flow</span>
        <strong class="tabular-nums ${summary.netCashFlow >= 0 ? "tone-profit" : "tone-loss"}">${esc(money(summary.netCashFlow))}</strong>
      </div>
      <div class="summary-mini">
        <span>Cash ROI</span>
        <strong class="tabular-nums tone-profit">${esc(roiText)}</strong>
      </div>
    `;
  }

  const accountsGrid = document.getElementById("prop-accounts-grid");
  if (accountsGrid) {
    accountsGrid.innerHTML = accounts
      .map((acc) => {
        const badgeClass =
          acc.status === "Active" || acc.status === "Passed"
            ? "badge-long"
            : acc.status === "Breached"
              ? "badge-short"
              : "badge-neutral";
        return `
          <article class="prop-account-card">
            <div class="prop-account-top">
              <strong>${esc(acc.firm)} · ${esc(acc.name)}</strong>
              <span class="badge ${badgeClass}">${esc(acc.status)}</span>
            </div>
            <div class="sidebar-account-meta">
              <span>Account Size</span>
              <strong class="tabular-nums">${esc(maskCurrency(acc.sizeUsd))}</strong>
            </div>
            <div class="sidebar-account-meta">
              <span>Split</span>
              <strong class="tabular-nums">${acc.splitPct}%</strong>
            </div>
            <p style="margin:4px 0 0;font-size:12px;color:var(--muted);">${esc(acc.note)}</p>
          </article>
        `;
      })
      .join("");
  }

  const ledgerBody = document.getElementById("prop-ledger-body");
  if (ledgerBody) {
    const rows =
      state.propFilter === "all" ? entries : entries.filter((e) => e.type === state.propFilter);
    ledgerBody.innerHTML = [...rows]
      .reverse()
      .map((row) => {
        const tone = row.cashAmount > 0 ? "tone-profit" : row.cashAmount < 0 ? "tone-loss" : "";
        return `
          <tr>
            <td class="tabular-nums">${esc(row.date)}</td>
            <td><strong>${esc(row.firm)}</strong><br /><span style="color:var(--dim);font-size:11px;">${esc(row.accountName)}</span></td>
            <td><span class="badge ${row.type === "payout" ? "badge-long" : row.type === "expense" ? "badge-short" : "badge-neutral"}">${esc(row.type)}</span></td>
            <td>${esc(row.category)}</td>
            <td class="tabular-nums" style="font-family:var(--font-mono);font-size:12px;">${esc(row.reference)}</td>
            <td>${esc(row.status)}</td>
            <td class="tabular-nums"><strong class="${tone}">${esc(money(row.cashAmount))}</strong></td>
          </tr>
        `;
      })
      .join("");
  }
}

/* ---------- Native <dialog> Trade Detail & Candle Replay Modal ---------- */

function stopReplayTimer() {
  if (state.replayTimer !== null) {
    window.clearInterval(state.replayTimer);
    state.replayTimer = null;
  }
  const playBtn = document.getElementById("replay-play-btn");
  if (playBtn) playBtn.textContent = "Play";
}

function renderTradeReplayFrame() {
  const trade = tradesById.get(state.modalTradeId);
  if (!trade) return;

  const totalBars = trade.replay.bars.length;
  const visible = Math.max(1, Math.min(totalBars, state.replayBarCount));
  const currentBar = trade.replay.bars[visible - 1];

  const chartHost = document.getElementById("trade-replay-chart");
  if (chartHost) {
    chartHost.innerHTML = renderCandlestickSVG(trade, visible);
  }

  const scrubber = document.getElementById("replay-scrubber");
  if (scrubber) {
    scrubber.max = String(totalBars);
    scrubber.value = String(visible);
  }

  const readout = document.getElementById("replay-readout");
  if (readout && currentBar) {
    const phase =
      visible - 1 < trade.replay.entryBarIndex
        ? "Pre-entry context"
        : visible - 1 < trade.replay.exitBarIndex
          ? "In position"
          : "Exited / Post-trade";
    const runningTone = currentBar.unrealizedNet >= 0 ? "tone-profit" : "tone-loss";
    readout.innerHTML = `
      <span>Bar ${visible}/${totalBars} (${esc(currentBar.timeLabel)} ET)</span>
      <span>Close: ${currentBar.close.toFixed(2)}</span>
      <span>Status: ${esc(phase)}</span>
      <span class="${runningTone}">Simulated Net: ${
        visible - 1 < trade.replay.entryBarIndex ? "$0.00" : esc(money(currentBar.unrealizedNet))
      }</span>
    `;
  }
}

function openTradeModal(tradeId, triggerEl = null) {
  const trade = tradesById.get(tradeId);
  const dialog = document.getElementById("trade-modal");
  if (!trade || !dialog) return;

  stopReplayTimer();
  state.modalTradeId = tradeId;
  state.replayBarCount = trade.replay.bars.length;
  state.lastModalTrigger = triggerEl || document.activeElement;

  const titleEl = document.getElementById("trade-modal-title");
  if (titleEl) {
    titleEl.textContent = `${trade.symbol} · ${trade.direction.toUpperCase()} · ${trade.dateKey} (${trade.id})`;
  }

  const metaEl = document.getElementById("trade-modal-meta");
  if (metaEl) {
    metaEl.innerHTML = `
      <div class="summary-mini">
        <span>Net P&amp;L</span>
        <strong class="tabular-nums ${trade.netPnl >= 0 ? "tone-profit" : "tone-loss"}">${esc(money(trade.netPnl))}</strong>
      </div>
      <div class="summary-mini">
        <span>Realized R</span>
        <strong class="tabular-nums ${trade.realizedR >= 0 ? "tone-profit" : "tone-loss"}">${esc(formatR(trade.realizedR))}</strong>
      </div>
      <div class="summary-mini">
        <span>Entry → Exit</span>
        <strong class="tabular-nums" style="font-size:14px;">${trade.avgEntry.toFixed(2)} → ${trade.exitPrice.toFixed(2)}</strong>
      </div>
      <div class="summary-mini">
        <span>Setup · Duration</span>
        <strong style="font-size:13px;">${esc(trade.setup)} (${esc(formatDuration(trade.durationMinutes))})</strong>
      </div>
    `;
  }

  const excursionsEl = document.getElementById("trade-modal-excursions");
  if (excursionsEl) {
    excursionsEl.innerHTML = `
      <div class="summary-mini">
        <span>Est. MAE</span>
        <strong class="tabular-nums tone-loss">${esc(money(trade.replay.mae))}</strong>
      </div>
      <div class="summary-mini">
        <span>Est. MFE</span>
        <strong class="tabular-nums tone-profit">${esc(money(trade.replay.mfe))}</strong>
      </div>
      <div class="summary-mini">
        <span>Capture Efficiency</span>
        <strong class="tabular-nums">${trade.replay.captureEfficiency}%</strong>
      </div>
      <div class="summary-mini">
        <span>Fees · Size</span>
        <strong class="tabular-nums">${esc(money(trade.fees, { signed: false }))} (${trade.quantity} ct)</strong>
      </div>
    `;
  }

  const rulesEl = document.getElementById("trade-modal-rules");
  if (rulesEl) {
    rulesEl.innerHTML = trade.ruleChecks
      .map(
        (rc) => `
        <li>
          <span class="badge ${rc.followed ? "badge-long" : "badge-short"}">${rc.followed ? "PASS" : "BREAK"}</span>
          <span>${esc(rc.rule)}</span>
        </li>
      `,
      )
      .join("");
  }

  const notesEl = document.getElementById("trade-modal-notes");
  if (notesEl) {
    notesEl.innerHTML = trade.notes
      .map(
        (line) => `<p style="margin:0 0 8px;font-size:12.5px;color:var(--muted);">${esc(line)}</p>`,
      )
      .join("");
  }

  renderTradeReplayFrame();
  if (!dialog.open) {
    dialog.showModal();
  }
}

function closeTradeModal() {
  stopReplayTimer();
  const dialog = document.getElementById("trade-modal");
  if (dialog && dialog.open) {
    dialog.close();
  }
  if (state.lastModalTrigger && typeof state.lastModalTrigger.focus === "function") {
    state.lastModalTrigger.focus();
  }
  state.lastModalTrigger = null;
}

/* ---------- Mobile Drawer ---------- */

function openMobileMenu(trigger) {
  const drawer = document.getElementById("mobile-nav");
  const main = document.getElementById("main-content");
  const btn = document.getElementById("mobile-nav-btn");
  if (!drawer) return;
  state.lastMenuTrigger = trigger || btn;
  drawer.hidden = false;
  if (main) main.inert = true;
  if (btn) btn.setAttribute("aria-expanded", "true");
  document.getElementById("mobile-nav-close")?.focus();
}

function closeMobileMenu({ restoreFocus = true } = {}) {
  const drawer = document.getElementById("mobile-nav");
  const main = document.getElementById("main-content");
  const btn = document.getElementById("mobile-nav-btn");
  if (!drawer || drawer.hidden) return;
  drawer.hidden = true;
  if (main) main.inert = false;
  if (btn) btn.setAttribute("aria-expanded", "false");
  if (restoreFocus && state.lastMenuTrigger && typeof state.lastMenuTrigger.focus === "function") {
    state.lastMenuTrigger.focus();
  }
}

/* ---------- View Routing & Master Render ---------- */

function setActiveView(viewName, { updateHash = true } = {}) {
  const target = VALID_VIEWS.has(viewName) ? viewName : "dashboard";
  state.activeView = target;

  for (const btn of document.querySelectorAll("[data-view-target]")) {
    if (btn.dataset.viewTarget === target) {
      btn.setAttribute("aria-current", "page");
    } else {
      btn.removeAttribute("aria-current");
    }
  }

  for (const section of document.querySelectorAll(".workspace-view[data-view]")) {
    section.hidden = section.dataset.view !== target;
  }

  if (updateHash) {
    const nextHash = `#view=${target}`;
    if (window.location.hash !== nextHash) {
      history.replaceState(null, "", nextHash);
    }
  }
}

function parseViewFromHash() {
  const match = window.location.hash.match(/^#view=([a-z-]+)$/i);
  if (match && VALID_VIEWS.has(match[1])) {
    return match[1];
  }
  return null;
}

function renderAll() {
  syncThemeControls();
  syncPrivacyControls();
  renderHeroPreview();

  const scoped = getScopedTrades();
  renderScopeHeader(scoped);
  renderDashboard(scoped);
  renderTradesView(scoped);
  renderCalendarView(scoped);
  renderReportsView(scoped);
  renderJournalView(scoped);
  renderPropFirmsView();

  if (document.getElementById("trade-modal")?.open && state.modalTradeId) {
    openTradeModal(state.modalTradeId, state.lastModalTrigger);
  }
}

/* ---------- Event Wiring ---------- */

function wireEvents() {
  // Header privacy & theme toggles
  for (const id of ["privacy-toggle", "mobile-privacy-toggle"]) {
    document.getElementById(id)?.addEventListener("click", () => {
      state.privacyMode = !state.privacyMode;
      renderAll();
    });
  }

  for (const id of ["theme-toggle", "mobile-theme-toggle"]) {
    document.getElementById(id)?.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      renderAll();
    });
  }

  // Mobile drawer
  document.getElementById("mobile-nav-btn")?.addEventListener("click", (e) => {
    openMobileMenu(e.currentTarget);
  });
  document.getElementById("mobile-nav-close")?.addEventListener("click", () => {
    closeMobileMenu();
  });
  document.getElementById("mobile-nav")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      closeMobileMenu();
      return;
    }
    if (e.target.closest("a[href^='#']")) {
      closeMobileMenu({ restoreFocus: false });
    }
  });
  document.getElementById("mobile-explore-cta")?.addEventListener("click", () => {
    closeMobileMenu({ restoreFocus: false });
  });

  // Enter full-screen interactive demo panel triggers
  for (const el of document.querySelectorAll("[data-enter-demo]")) {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      closeMobileMenu({ restoreFocus: false });
      enterDemoPanel(state.activeView || "dashboard", { updateHash: true });
    });
  }

  // Exit full-screen demo panel back to showcase overview
  for (const id of ["exit-panel-btn", "header-exit-panel-btn"]) {
    document.getElementById(id)?.addEventListener("click", () => {
      exitDemoPanel({ targetSection: "welcome" });
    });
  }

  document.getElementById("brand-home-link")?.addEventListener("click", (e) => {
    if (state.appMode === "panel") {
      e.preventDefault();
      exitDemoPanel({ targetSection: "welcome" });
    }
  });

  // Clicking showcase nav anchors in mobile drawer exits panel mode first
  for (const link of document.querySelectorAll(
    'a[href="#welcome"], a[href="#architecture"], a[href="#self-host"], a[href="#license"]',
  )) {
    link.addEventListener("click", () => {
      if (state.appMode === "panel") {
        const target = link.getAttribute("href")?.slice(1) || "welcome";
        exitDemoPanel({ targetSection: target, updateHash: false });
      }
    });
  }

  // Workspace sidebar view switching
  for (const btn of document.querySelectorAll("[data-view-target]")) {
    btn.addEventListener("click", () => {
      if (state.appMode !== "panel") {
        enterDemoPanel(btn.dataset.viewTarget, { updateHash: true });
      } else {
        setActiveView(btn.dataset.viewTarget);
      }
    });
  }

  // Hash navigation (#view=... or section anchor)
  window.addEventListener("hashchange", () => {
    const hash = window.location.hash;
    const hashView = parseViewFromHash();
    if (hashView) {
      enterDemoPanel(hashView, { updateHash: false });
    } else if (hash === "#workspace") {
      enterDemoPanel(state.activeView || "dashboard", { updateHash: false });
    } else if (["#welcome", "#architecture", "#self-host", "#license", ""].includes(hash)) {
      if (state.appMode === "panel") {
        exitDemoPanel({ targetSection: hash ? hash.slice(1) : "welcome", updateHash: false });
      }
    }
  });

  // Global timeframe & symbol filters + reset
  document.getElementById("dash-range-filters")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-range]");
    if (!btn) return;
    state.range = btn.dataset.range;
    renderAll();
  });

  document.getElementById("dash-symbol-filters")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-symbol]");
    if (!btn) return;
    state.symbol = btn.dataset.symbol;
    renderAll();
  });

  document.getElementById("reset-filters-btn")?.addEventListener("click", () => {
    state.range = "all";
    state.symbol = "ALL";
    state.tradesSearch = "";
    state.tradesSetup = "ALL";
    state.tradesOutcome = "all";
    const searchInput = document.getElementById("trades-search");
    const setupSelect = document.getElementById("trades-setup-filter");
    if (searchInput) searchInput.value = "";
    if (setupSelect) setupSelect.value = "ALL";
    renderAll();
  });

  // AI prompt chips
  document.getElementById("ai-prompt-chips")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-ai-prompt]");
    if (!btn) return;
    state.aiPrompt = btn.dataset.aiPrompt;
    renderDashboard(getScopedTrades());
  });

  // Trades toolbar & sorting
  document.getElementById("trades-search")?.addEventListener("input", (e) => {
    state.tradesSearch = e.target.value;
    renderTradesView(getScopedTrades());
  });

  document.getElementById("trades-setup-filter")?.addEventListener("change", (e) => {
    state.tradesSetup = e.target.value;
    renderTradesView(getScopedTrades());
  });

  document.getElementById("trades-outcome-filters")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-outcome]");
    if (!btn) return;
    state.tradesOutcome = btn.dataset.outcome;
    renderTradesView(getScopedTrades());
  });

  for (const sortBtn of document.querySelectorAll("[data-sort]")) {
    sortBtn.addEventListener("click", () => {
      const key = sortBtn.dataset.sort;
      if (state.tradesSortKey === key) {
        state.tradesSortDir = state.tradesSortDir === "asc" ? "desc" : "asc";
      } else {
        state.tradesSortKey = key;
        state.tradesSortDir = key === "symbol" ? "asc" : "desc";
      }
      renderTradesView(getScopedTrades());
    });
  }

  // Calendar month & day click
  document.getElementById("cal-month-tabs")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-month]");
    if (!btn) return;
    state.calendarMonth = btn.dataset.month;
    state.selectedCalDate = null;
    renderCalendarView(getScopedTrades());
  });

  document.getElementById("cal-grid")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cal-date]");
    if (!btn) return;
    state.selectedCalDate = btn.dataset.calDate;
    renderCalendarView(getScopedTrades());
  });

  // Reports subtabs & scatter toggle
  document.getElementById("reports-subtabs")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-report-tab]");
    if (!btn) return;
    state.reportsTab = btn.dataset.reportTab;
    renderReportsView(getScopedTrades());
  });

  document.getElementById("scatter-metric-toggle")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-scatter-metric]");
    if (!btn) return;
    state.scatterMetric = btn.dataset.scatterMetric;
    renderReportsView(getScopedTrades());
  });

  // Journal date selector
  document.getElementById("journal-session-list")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-journal-date]");
    if (!btn) return;
    state.selectedJournalDate = btn.dataset.journalDate;
    renderJournalView(getScopedTrades());
  });

  // Prop ledger filters
  document.getElementById("prop-filter-tabs")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-prop-filter]");
    if (!btn) return;
    state.propFilter = btn.dataset.propFilter;
    renderPropFirmsView();
  });

  // Delegated click for opening Trade Replay Modal
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-open-trade]");
    if (!trigger) return;
    openTradeModal(trigger.dataset.openTrade, trigger);
  });

  // Modal controls & replay timer
  const dialog = document.getElementById("trade-modal");
  document.getElementById("trade-modal-close")?.addEventListener("click", () => closeTradeModal());
  dialog?.addEventListener("click", (e) => {
    if (e.target === dialog) closeTradeModal();
  });
  dialog?.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeTradeModal();
  });

  document.getElementById("replay-restart-btn")?.addEventListener("click", () => {
    const trade = tradesById.get(state.modalTradeId);
    if (!trade) return;
    stopReplayTimer();
    state.replayBarCount = Math.max(1, trade.replay.entryBarIndex);
    renderTradeReplayFrame();
  });

  document.getElementById("replay-step-btn")?.addEventListener("click", () => {
    const trade = tradesById.get(state.modalTradeId);
    if (!trade) return;
    stopReplayTimer();
    const max = trade.replay.bars.length;
    state.replayBarCount = state.replayBarCount >= max ? 1 : state.replayBarCount + 1;
    renderTradeReplayFrame();
  });

  document.getElementById("replay-play-btn")?.addEventListener("click", (e) => {
    const trade = tradesById.get(state.modalTradeId);
    if (!trade) return;
    if (state.replayTimer !== null) {
      stopReplayTimer();
      return;
    }
    const max = trade.replay.bars.length;
    if (state.replayBarCount >= max) {
      state.replayBarCount = 1;
      renderTradeReplayFrame();
    }
    e.currentTarget.textContent = "Pause";
    state.replayTimer = window.setInterval(() => {
      if (state.replayBarCount >= max) {
        stopReplayTimer();
        return;
      }
      state.replayBarCount += 1;
      renderTradeReplayFrame();
    }, 320);
  });

  document.getElementById("replay-scrubber")?.addEventListener("input", (e) => {
    stopReplayTimer();
    state.replayBarCount = Number(e.target.value);
    renderTradeReplayFrame();
  });

  // Copy buttons
  for (const btn of document.querySelectorAll("[data-copy-text]")) {
    btn.addEventListener("click", async () => {
      const text = btn.getAttribute("data-copy-text");
      if (!text) return;
      const original = btn.textContent;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        btn.classList.add("is-copied");
        btn.textContent = "Copied";
      } catch {
        btn.textContent = "Copy failed";
      }
      window.setTimeout(() => {
        btn.classList.remove("is-copied");
        btn.textContent = original;
      }, 1800);
    });
  }

  // Global Escape handler for mobile drawer
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const drawer = document.getElementById("mobile-nav");
      if (drawer && !drawer.hidden) {
        closeMobileMenu();
      }
    }
  });
}

function enterDemoPanel(view = "dashboard", { updateHash = true } = {}) {
  state.appMode = "panel";
  document.documentElement.dataset.appMode = "panel";
  setActiveView(VALID_VIEWS.has(view) ? view : "dashboard", { updateHash });
  window.scrollTo({ top: 0, behavior: "auto" });
}

function exitDemoPanel({ targetSection = "welcome", updateHash = true } = {}) {
  state.appMode = "showcase";
  document.documentElement.dataset.appMode = "showcase";
  if (updateHash) {
    window.history.replaceState(
      null,
      "",
      targetSection ? `#${targetSection}` : window.location.pathname,
    );
  }
  const el = targetSection ? document.getElementById(targetSection) : null;
  if (el) {
    el.scrollIntoView({ behavior: "auto" });
  } else {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}

function init() {
  const params = new URLSearchParams(window.location.search);
  const hashView = parseViewFromHash();
  const wantsPanel =
    Boolean(hashView) || window.location.hash === "#workspace" || params.get("demo") === "1";
  if (wantsPanel) {
    state.appMode = "panel";
    document.documentElement.dataset.appMode = "panel";
    setActiveView(hashView || "dashboard", { updateHash: false });
  } else {
    state.appMode = "showcase";
    document.documentElement.dataset.appMode = "showcase";
    setActiveView("dashboard", { updateHash: false });
  }
  renderAll();
  wireEvents();
}

init();
