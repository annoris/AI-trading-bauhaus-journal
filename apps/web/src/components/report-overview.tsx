"use client";

import { useState } from "react";
import { EquityArea } from "./charts/equity-area";
import { DailyBars } from "./charts/daily-bars";
import { Pnl } from "./pnl";
import { ChartNoAxesCombined } from "lucide-react";
import type {
  TradeMetrics,
  DayStats,
  EquityPoint,
  AnalysisFilters,
  BucketStats,
} from "@trading-bauhaus/journal-core";
import { TimeHeatmap } from "./charts/time-heatmap";
import { ReviewExport } from "./review-export";
import { MonetaryValue } from "./privacy";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { useApi } from "@/lib/use-api";
import { fmtMoney, fmtPercent, pnlClass } from "@/lib/utils";
import { describeFilters } from "@/lib/filter-description";

interface OverviewData {
  metrics: TradeMetrics | null;
  days: DayStats[];
  dailyCumulative: EquityPoint[];
  buckets: Record<
    "symbol" | "tag" | "mistake" | "playbook" | "weekday" | "hour" | "duration" | "direction",
    BucketStats[]
  >;
  currencies: string[];
  timeZone: string;
  accounts: { id: string; name: string }[];
  playbooks: { id: string; name: string }[];
}

// Keep the original overview's aggregations and ordering alongside the advanced reports.
const SECTIONS = [
  { key: "symbol", title: "Performance by symbol" },
  { key: "direction", title: "Long vs short" },
  { key: "weekday", title: "By weekday" },
  { key: "duration", title: "By holding time" },
  { key: "tag", title: "By tag" },
  { key: "mistake", title: "By mistake" },
  { key: "playbook", title: "Performance by strategy" },
] as const;

export function ReportOverview({ query, filters }: { query: string; filters: AnalysisFilters }) {
  const [chart, setChart] = useState("equity");
  const { data, error, loading } = useApi<OverviewData>(`/api/stats?${query}`);
  if (error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    );
  if (loading || !data) return <Skeleton className="h-72" />;
  if (data.currencies.length > 1)
    return (
      <p className="rounded-lg border p-4 text-sm">
        These accounts use different currencies ({data.currencies.join(", ")}). Select accounts with
        the same currency in Filters to compare monetary results.
      </p>
    );
  const currency = data.currencies[0] ?? "USD";
  const label = (dimension: string, key: string) =>
    dimension === "playbook" ? (data.playbooks.find((book) => book.id === key)?.name ?? key) : key;
  const m = data.metrics;
  return (
    <div className="reports-overview space-y-4">
      {m && (
        <div className="reports-kpi-grid">
          <ReportMetric label="Net P&L">
            <Pnl value={m.netPnl} currency={currency} />
            <small>{m.closedTrades} closed trades</small>
          </ReportMetric>
          <ReportMetric label="Total trades">
            <span>{m.closedTrades}</span>
            <small>
              {m.wins} wins · {m.losses} losses · {m.breakevens} BE
            </small>
          </ReportMetric>
          <ReportMetric label="Win rate">
            <span>{fmtPercent(m.winRate, 1)}</span>
            <small>Across closed trades</small>
          </ReportMetric>
          <ReportMetric label="Profit factor">
            <span>{m.profitFactorIsInfinite ? "∞" : (m.profitFactor?.toFixed(2) ?? "—")}</span>
            <small>Gross profit / gross loss</small>
          </ReportMetric>
          <ReportMetric label="Avg win / loss">
            <span>{m.avgWinLossRatio?.toFixed(2) ?? "—"}</span>
            <small>
              <MonetaryValue>
                {m.avgWin === null ? "—" : fmtMoney(m.avgWin, currency)} /{" "}
                {m.avgLoss === null ? "—" : fmtMoney(-m.avgLoss, currency)}
              </MonetaryValue>
            </small>
          </ReportMetric>
          <ReportMetric label="Expectancy / trade">
            {m.expectancy === null ? (
              <span>—</span>
            ) : (
              <Pnl value={m.expectancy} currency={currency} />
            )}
            <small>Average net result</small>
          </ReportMetric>
          <ReportMetric label="Max drawdown">
            <Pnl value={-m.maxDrawdown} currency={currency} />
            <small>Peak to trough</small>
          </ReportMetric>
        </div>
      )}
      <div className="reports-chart-grid">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Cumulative net P&amp;L</CardTitle>
            <select
              aria-label="Report chart"
              value={chart}
              onChange={(e) => setChart(e.target.value)}
              className="rounded-md border bg-card px-3 py-1 text-xs"
            >
              <option value="equity">Equity curve</option>
              <option value="time">Trade time performance</option>
            </select>
          </CardHeader>
          <CardContent>
            {chart === "equity" ? (
              <EquityArea data={data.dailyCumulative} height={220} currency={currency} />
            ) : (
              <TimeHeatmap hours={data.buckets.hour} currency={currency} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daily net P&amp;L</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyBars data={data.days} height={220} currency={currency} />
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Trading overview · {data.timeZone} · {currency}
        </p>
        <ReviewExport
          containsFinancialData
          document={{
            title: "Trading overview",
            subtitle: `${data.timeZone} · ${currency}`,
            lines: [
              `Filters: ${describeFilters(filters, data.accounts, data.playbooks)}`,
              "",
              "Trade time performance (opening hour)",
              ...data.buckets.hour.map(
                (b) => `${b.key}:00: ${b.trades} trades | Net P&L ${fmtMoney(b.netPnl, currency)}`,
              ),
              ...SECTIONS.flatMap((section) => [
                "",
                section.title,
                ...data.buckets[section.key].map(
                  (b) =>
                    `${label(section.key, b.key)}: ${b.trades} trades | Win ${fmtPercent(b.winRate, 0)} | Net P&L ${fmtMoney(b.netPnl, currency)}`,
                ),
              ]),
            ],
          }}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((section) => (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartNoAxesCombined className="h-4 w-4 text-brand" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.buckets[section.key].length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {section.key === "tag" || section.key === "mistake" || section.key === "playbook"
                    ? "Annotate trades to unlock this breakdown."
                    : "No data yet."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{section.key === "playbook" ? "Strategy" : section.key}</TableHead>
                      <TableHead className="text-right">Trades</TableHead>
                      <TableHead className="text-right">Win %</TableHead>
                      <TableHead className="text-right">Net P&L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.buckets[section.key].map((bucket) => (
                      <TableRow key={bucket.key}>
                        <TableCell className="font-medium">
                          {label(section.key, bucket.key)}
                        </TableCell>
                        <TableCell className="tnum text-right text-muted-foreground">
                          {bucket.trades}
                        </TableCell>
                        <TableCell className="tnum text-right">
                          {fmtPercent(bucket.winRate, 0)}
                        </TableCell>
                        <TableCell className={`tnum text-right ${pnlClass(bucket.netPnl)}`}>
                          <MonetaryValue>{fmtMoney(bucket.netPnl, currency)}</MonetaryValue>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Weekday and hour use trade opening times. Overview trade counts include open positions; win
        rates use closed trades. Holding time requires a closed trade. Tags and mistakes can
        overlap. By symbol shows the top 20 by net P&L; Breakdowns includes every symbol and
        additional metrics for closed trades.
      </p>
    </div>
  );
}

function ReportMetric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card className="reports-metric">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="reports-metric-value">{children}</div>
      </CardContent>
    </Card>
  );
}
