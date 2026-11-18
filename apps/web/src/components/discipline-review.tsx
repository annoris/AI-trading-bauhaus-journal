"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useApi } from "@/lib/use-api";
import { disciplineReview, type DisciplineDay } from "@/lib/discipline";
import type { Routine, RoutineCheck } from "@/lib/progress";
import { Pnl } from "@/components/pnl";
export function DisciplineReview({
  rules,
  checks,
  date,
}: {
  rules: Routine[];
  checks: RoutineCheck[];
  date: string;
}) {
  const { data, error } = useApi<{ days: DisciplineDay[]; timeZone: string }>("/api/discipline");
  if (!date) return null;
  const review = disciplineReview(rules, checks, date, data?.days ?? []);
  const focus = review.habits.find((h) => h.missed > 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Discipline & results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          30-day review · {review.from} to {date} · All journal accounts
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Fully completed days</p>
            <p className="text-2xl font-semibold">
              {review.complete} / {review.reviewed}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Days needing a check-in</p>
            <p className="text-2xl font-semibold">{review.scheduled - review.reviewed}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Next focus</p>
            <p className="text-sm">
              {focus
                ? focus.title
                : review.reviewed
                  ? "Keep your routine consistent."
                  : "Check in on your scheduled routines to start your review."}
            </p>
            {focus && (
              <p className="text-xs text-muted-foreground">
                Marked incomplete {focus.missed} of {focus.recorded} check-ins.
              </p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Only days with every scheduled routine explicitly checked are assessed. Missing check-ins
          are not counted as broken discipline.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {!data && !error && (
          <p className="text-sm text-muted-foreground">Loading trading results…</p>
        )}
        {data && !review.groups.some((g) => g.complete.days || g.incomplete.days) && (
          <p className="text-sm text-muted-foreground">
            No closed trades overlap your assessed days in this period.
          </p>
        )}
        {review.groups
          .filter((g) => g.complete.days || g.incomplete.days)
          .map((g) => (
            <div key={g.currency} className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-semibold">
                Average net P&L per trading day · {g.currency}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["All routines completed", g.complete],
                  ["Some routines marked incomplete", g.incomplete],
                ].map(([label, group]) => {
                  const row = group as typeof g.complete;
                  return (
                    <div key={label as string}>
                      <p className="text-xs text-muted-foreground">{label as string}</p>
                      <p className="text-xl">
                        {row.average === null ? (
                          "—"
                        ) : (
                          <Pnl value={row.average} currency={g.currency} />
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.days} trading days · {row.trades} closed trades
                      </p>
                    </div>
                  );
                })}
              </div>
              {(g.complete.days < 5 || g.incomplete.days < 5) && (
                <p className="text-xs text-muted-foreground">
                  Small sample: collect at least 5 trading days in each group before interpreting
                  the comparison.
                </p>
              )}
            </div>
          ))}
        <p className="text-xs text-muted-foreground">
          Results use trade closing dates in your journal timezone. This comparison shows an
          association, not proof that a routine caused a profit or loss.
        </p>
      </CardContent>
    </Card>
  );
}
