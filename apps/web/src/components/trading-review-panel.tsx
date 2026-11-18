"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pnl } from "@/components/pnl";
import { MonetaryValue } from "@/components/privacy";
import { fmtMoney, fmtPercent } from "@/lib/utils";
import type { TradingReview } from "@/lib/trading-review";

type Strategy = { key: string; trades: number; netPnl: number; winRate: number | null };
export function TradingReviewPanel({
  review,
  strategies,
  playbooks,
  currency,
  query,
  view,
}: {
  review: TradingReview;
  strategies: Strategy[];
  playbooks: { id: string; name: string }[];
  currency: string;
  query: string;
  view?: "discipline" | "strategy" | "queue";
}) {
  const link = (filter: string, value: string) => {
    const params = new URLSearchParams(query);
    params.set(filter, value);
    return `/trades?${params}`;
  };
  return (
    <section
      aria-label="Trading review"
      className={view ? "dashboard-review-widget h-full" : "grid gap-3 px-4 pt-4 lg:grid-cols-3"}
    >
      {(!view || view === "discipline") && (
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Discipline & review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Reviewed trades</span>
              <strong>
                {review.reviewed} / {review.closed}
              </strong>
            </div>
            <progress
              aria-label="Reviewed trades"
              value={review.reviewed}
              max={review.closed || 1}
              className="h-2 w-full accent-primary"
            />
            <div className="flex justify-between">
              <span>Planned risk recorded</span>
              <strong>
                {review.riskCoverage} / {review.closed}
              </strong>
            </div>
            <progress
              aria-label="Planned risk recorded"
              value={review.riskCoverage}
              max={review.closed || 1}
              className="h-2 w-full accent-primary"
            />
            <div className="flex justify-between">
              <span>Trades with recorded mistakes</span>
              <strong>{review.withMistakes}</strong>
            </div>
            <progress
              aria-label="Trades with mistakes"
              value={review.withMistakes}
              max={review.closed || 1}
              className="h-2 w-full accent-destructive"
            />
            <div className="flex justify-between gap-2 rounded-lg border p-2 text-xs">
              <span>Losses on mistake-tagged trades</span>
              <MonetaryValue>
                {fmtMoney(review.mistakeLosses, currency).replace(/^\+/, "")}
              </MonetaryValue>
            </div>
            <p className="text-xs text-muted-foreground">
              Closed trades only. Mistake losses count each losing trade once; they do not measure
              what caused the loss.
            </p>
          </CardContent>
        </Card>
      )}
      {(!view || view === "strategy") && (
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Strategy performance</CardTitle>
          </CardHeader>
          <CardContent>
            {strategies.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="pb-2 text-left">Strategy</th>
                      <th className="pb-2 text-right">Trades</th>
                      <th className="pb-2 text-right">Win %</th>
                      <th className="pb-2 text-right">Net P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategies.map((strategy) => (
                      <tr key={strategy.key} className="border-t">
                        <td className="py-2 pr-2">
                          <Link className="hover:underline" href={link("playbookId", strategy.key)}>
                            {playbooks.find((p) => p.id === strategy.key)?.name ??
                              "Archived strategy"}
                          </Link>
                        </td>
                        <td className="text-right">{strategy.trades}</td>
                        <td className="text-right">
                          {strategy.winRate === null ? "–" : fmtPercent(strategy.winRate)}
                        </td>
                        <td className="text-right">
                          <Pnl value={strategy.netPnl} currency={currency} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Assign a strategy to closed trades to compare your setups.
              </p>
            )}
            <Link
              href="/playbooks"
              className="mt-3 inline-block text-xs text-primary hover:underline"
            >
              Manage strategies →
            </Link>
          </CardContent>
        </Card>
      )}
      {(!view || view === "queue") && (
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Review queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {review.pending.length ? (
              review.pending.map((trade) => (
                <Link
                  key={trade.key}
                  href={`/trades/${encodeURIComponent(trade.key)}?${query}`}
                  className="flex items-center justify-between gap-3 rounded-md border p-2 hover:bg-accent"
                >
                  <div>
                    <div className="text-sm font-medium">{trade.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      {trade.mistakes.length ? trade.mistakes.join(" · ") : "Awaiting review"}
                    </div>
                  </div>
                  <Pnl value={trade.netPnl} currency={currency} />
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {review.closed
                  ? "All closed trades have been reviewed."
                  : "Close a trade to start your review."}
              </p>
            )}
            <Link
              href={link("reviewed", "no")}
              className="inline-block text-xs text-primary hover:underline"
            >
              View all unreviewed trades →
            </Link>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
