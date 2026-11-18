"use client";
import { CircleCheck, CircleAlert, ChartNoAxesColumnIncreasing } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { useFilters } from "@/components/filter-bar";
import { MonetaryValue } from "./privacy";
import type { GroupSummary } from "@trading-bauhaus/journal-core";
interface Adherence {
  id: string;
  total: number;
  evaluated: number;
  possible: number;
  rate: number | null;
  currencies: string[];
  followed: GroupSummary;
  broken: GroupSummary;
  unassessed: number;
  rules: {
    rule: string;
    evaluated: number;
    rate: number | null;
    followed: GroupSummary;
    broken: GroupSummary;
  }[];
}
const pct = (n: number | null) => (n === null ? "-" : `${Math.round(n * 100)}%`);
export function AdherenceReport({ bookId }: { bookId: string }) {
  const { query } = useFilters();
  const { data, error } = useApi<{ books: Adherence[] }>(`/api/adherence?${query}`);
  const b = data?.books.find((b) => b.id === bookId);
  if (error)
    return (
      <p role="alert" className="text-xs text-destructive">
        {error}
      </p>
    );
  if (!b) return null;
  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Rule adherence</span>
        <strong className="text-sm">{b.rate === null ? "Not assessed yet" : pct(b.rate)}</strong>
      </div>
      <p className="text-xs text-muted-foreground">
        {b.evaluated}/{b.possible} rule assessments across {b.total} filtered closed trades.{" "}
        {b.unassessed} trades still need assessment.
      </p>
      <div className="grid grid-cols-2 gap-3 text-xs">
        {[
          ["All rules followed", b.followed],
          ["At least one broken", b.broken],
        ].map(([title, stats]) => {
          const s = stats as GroupSummary;
          return (
            <div key={String(title)} className="playbook-outcome rounded-xl border p-4">
              <p className="mb-2 flex items-center gap-2 font-medium">
                {title === "All rules followed" ? (
                  <CircleCheck className="h-5 w-5 text-brand" />
                ) : (
                  <CircleAlert className="h-5 w-5 text-loss" />
                )}
                {String(title)}
              </p>
              <p>
                {s.trades === 0
                  ? "No assessed trades"
                  : `${s.trades} trades · ${pct(s.winRate)} win`}
              </p>
              {b.currencies.length <= 1 && s.trades > 0 && (
                <p className={s.netPnl >= 0 ? "text-profit" : "text-loss"}>
                  <MonetaryValue>
                    {s.netPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                    {b.currencies[0] ?? ""}
                  </MonetaryValue>
                </p>
              )}
            </div>
          );
        })}
      </div>
      {b.currencies.length > 1 && (
        <p className="text-xs text-muted-foreground">P&L hidden for mixed currencies.</p>
      )}
      <details className="text-xs">
        <summary className="playbook-rule-summary">
          <ChartNoAxesColumnIncreasing className="h-4 w-4 text-brand" />
          Performance by rule
        </summary>
        <div className="mt-2 space-y-3">
          {b.rules.map((r) => (
            <div key={r.rule} className="border-t pt-2">
              <p className="font-medium">{r.rule}</p>
              <p className="text-muted-foreground">
                {pct(r.rate)} followed · {r.evaluated} assessments
              </p>
              <p>
                Followed: {r.followed.trades} trades / {pct(r.followed.winRate)} win · Broken:{" "}
                {r.broken.trades} / {pct(r.broken.winRate)} win
              </p>
              {b.currencies.length <= 1 && (
                <p>
                  Net P&L: <MonetaryValue>{r.followed.netPnl.toFixed(2)}</MonetaryValue> followed /{" "}
                  <MonetaryValue>{r.broken.netPnl.toFixed(2)}</MonetaryValue> broken{" "}
                  {b.currencies[0] ?? ""}
                </p>
              )}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
