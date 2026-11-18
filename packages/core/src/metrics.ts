import type { AnnotatedTrade } from "./types";
import { dailyStats, drawdown, equityCurve, type DayStats, type EquityPoint } from "./equity";
import { tradeR } from "./analysis";

export interface MetricsOptions {
  timeZone?: string;
  /** Anchors drawdown % and balance-relative stats. */
  initialBalance?: number;
}

export interface TradeMetrics {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  netPnl: number;
  grossPnl: number;
  fees: number;
  /** wins / (wins + losses + breakevens), null with no closed trades. */
  winRate: number | null;
  /** Winning days / total trading days. */
  dayWinRate: number | null;
  tradingDays: number;
  /** Gross profit / gross loss. Null with no closed trades; Infinity encoded as null + flag. */
  profitFactor: number | null;
  /** True when there are profits and zero losses (profit factor is unbounded). */
  profitFactorIsInfinite: boolean;
  avgWin: number | null;
  avgLoss: number | null;
  /** avgWin / avgLoss. */
  avgWinLossRatio: number | null;
  /** Per-trade expected value: winRate×avgWin − lossRate×avgLoss. */
  expectancy: number | null;
  largestWin: number;
  largestLoss: number;
  maxWinStreak: number;
  maxLossStreak: number;
  /** Positive = current winning streak, negative = losing streak. */
  currentStreak: number;
  totalVolume: number;
  avgDurationMs: number | null;
  maxDrawdown: number;
  maxDrawdownPct: number | null;
  /** netPnl / maxDrawdown. Null when no drawdown yet. */
  recoveryFactor: number | null;
  /** Largest single winning day's share of total gross profit across days (0-1). */
  profitConcentration: number | null;
  /** Average realized R multiple across trades with a stop-loss annotation. */
  avgRealizedR: number | null;
  tradesWithRisk: number;
  /** Annualized Sharpe ratio based on trading days (sqrt(252)). Null when < 2 trading days or zero volatility. */
  sharpeRatio: number | null;
  /** Annualized Sortino ratio based on downside deviation of trading days (sqrt(252)). */
  sortinoRatio: number | null;
  /** Van Tharp's System Quality Number: sqrt(N) * (meanR / stdDevR). */
  sqn: number | null;
  /** Median realized R multiple across trades with risk. */
  medianRealizedR: number | null;
  /** Sample standard deviation of realized R multiples. */
  stdDevRealizedR: number | null;
  /** Mathematical expectancy in R units. */
  rExpectancy: number | null;
}

const mean = (values: number[]): number | null =>
  values.length === 0 ? null : values.reduce((total, v) => total + v, 0) / values.length;

const sampleStdDev = (values: number[], avg: number): number | null => {
  if (values.length < 2) return null;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
};

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid]!;
  }
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
};

/** Realized R multiple: net P&L over the dollar risk implied by the annotated stop. */
export const realizedR = (trade: AnnotatedTrade): number | null => {
  return tradeR(trade);
};

export const computeMetrics = (
  trades: AnnotatedTrade[],
  options: MetricsOptions = {},
): TradeMetrics =>
  metricsFromOverview(
    trades,
    options,
    dailyStats(trades, options.timeZone ?? "UTC"),
    equityCurve(trades),
  );

const metricsFromOverview = (
  trades: AnnotatedTrade[],
  options: MetricsOptions,
  days: DayStats[],
  curve: EquityPoint[],
): TradeMetrics => {
  const closed = trades.filter((t) => t.status !== "open");
  const wins = closed.filter((t) => t.status === "win");
  const losses = closed.filter((t) => t.status === "loss");
  const breakevens = closed.filter((t) => t.status === "breakeven");

  const grossProfit = closed.reduce((total, t) => total + Math.max(0, t.netPnl), 0);
  const grossLoss = closed.reduce((total, t) => total - Math.min(0, t.netPnl), 0);

  const winningDays = days.filter((d) => d.netPnl > 0).length;

  // Streaks over closed trades in close order.
  const ordered = [...closed].sort((a, b) => Date.parse(a.closedAt!) - Date.parse(b.closedAt!));
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let run = 0;
  for (const trade of ordered) {
    if (trade.status === "breakeven") continue;
    const direction = trade.status === "win" ? 1 : -1;
    run = Math.sign(run) === direction ? run + direction : direction;
    if (run > maxWinStreak) maxWinStreak = run;
    if (-run > maxLossStreak) maxLossStreak = -run;
  }

  const dd = drawdown(curve, options.initialBalance ?? 0);

  const netPnl = closed.reduce((total, t) => total + t.netPnl, 0);
  const avgWin = mean(wins.map((t) => t.netPnl));
  const avgLoss = mean(losses.map((t) => Math.abs(t.netPnl)));
  const winRate = closed.length > 0 ? wins.length / closed.length : null;

  const dayProfits = days.filter((d) => d.netPnl > 0).map((d) => d.netPnl);
  const totalDayProfit = dayProfits.reduce((total, v) => total + v, 0);

  const rMultiples = trades.map((trade) => realizedR(trade)).filter((r): r is number => r !== null);

  const dailyPnLs = days.map((d) => d.netPnl);
  const avgDailyPnl = mean(dailyPnLs) ?? 0;
  const dailyStdDev = sampleStdDev(dailyPnLs, avgDailyPnl);
  const sharpeRatio =
    dailyStdDev !== null && dailyStdDev > 0 ? (avgDailyPnl / dailyStdDev) * Math.sqrt(252) : null;

  const negativeDailyPnLs = dailyPnLs.map((p) => Math.min(0, p));
  const downsideDeviation = Math.sqrt(
    negativeDailyPnLs.reduce((sum, v) => sum + Math.pow(v, 2), 0) / (days.length || 1),
  );
  const sortinoRatio =
    downsideDeviation > 0 ? (avgDailyPnl / downsideDeviation) * Math.sqrt(252) : null;

  const rMean = mean(rMultiples);
  const rStdDev = rMean !== null ? sampleStdDev(rMultiples, rMean) : null;
  const sqn =
    rMultiples.length >= 2 && rMean !== null && rStdDev !== null && rStdDev > 0
      ? Math.sqrt(rMultiples.length) * (rMean / rStdDev)
      : null;
  const medianRealizedR = median(rMultiples);
  const rExpectancy = rMean;

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    openTrades: trades.length - closed.length,
    wins: wins.length,
    losses: losses.length,
    breakevens: breakevens.length,
    netPnl,
    grossPnl: closed.reduce((total, t) => total + t.grossPnl, 0),
    fees: closed.reduce((total, t) => total + t.fees, 0),
    winRate,
    dayWinRate: days.length > 0 ? winningDays / days.length : null,
    tradingDays: days.length,
    profitFactor: closed.length === 0 ? null : grossLoss > 0 ? grossProfit / grossLoss : null,
    profitFactorIsInfinite: closed.length > 0 && grossLoss === 0 && grossProfit > 0,
    avgWin,
    avgLoss,
    avgWinLossRatio: avgWin !== null && avgLoss !== null && avgLoss > 0 ? avgWin / avgLoss : null,
    expectancy: closed.length > 0 ? netPnl / closed.length : null,
    largestWin: wins.reduce((max, t) => Math.max(max, t.netPnl), 0),
    largestLoss: losses.reduce((min, t) => Math.min(min, t.netPnl), 0),
    maxWinStreak,
    maxLossStreak,
    currentStreak: run,
    totalVolume: trades.reduce((total, t) => total + t.quantity, 0),
    avgDurationMs: mean(
      closed.map((t) => t.durationMs).filter((d): d is number => d !== undefined),
    ),
    maxDrawdown: dd.maxDrawdown,
    maxDrawdownPct: dd.maxDrawdownPct,
    recoveryFactor: dd.maxDrawdown > 0 ? netPnl / dd.maxDrawdown : null,
    profitConcentration:
      totalDayProfit > 0
        ? dayProfits.reduce((max, value) => Math.max(max, value), 0) / totalDayProfit
        : null,
    avgRealizedR: mean(rMultiples),
    tradesWithRisk: rMultiples.length,
    sharpeRatio,
    sortinoRatio,
    sqn,
    medianRealizedR,
    stdDevRealizedR: rStdDev,
    rExpectancy,
  };
};

/** Convenience: metrics plus the curves most dashboards need, in one call. */
export const computeOverview = (trades: AnnotatedTrade[], options: MetricsOptions = {}) => {
  const timeZone = options.timeZone ?? "UTC";
  const days = dailyStats(trades, timeZone);
  const equity = equityCurve(trades);
  return {
    metrics: metricsFromOverview(trades, options, days, equity),
    days,
    equity,
  };
};
