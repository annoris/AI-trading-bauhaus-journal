import { scheduledRules, type Routine, type RoutineCheck } from "./progress";
export interface DisciplineDay {
  date: string;
  netPnl: number;
  trades: number;
  currency: string;
}
export function disciplineReview(
  rules: Routine[],
  checks: RoutineCheck[],
  end: string,
  results: DisciplineDay[],
) {
  const start = new Date(`${end}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 29);
  const from = start.toISOString().slice(0, 10);
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + i);
    const key = date.toISOString().slice(0, 10);
    const scheduled = scheduledRules(rules, key);
    const assessed = scheduled.map((r) => checks.find((c) => c.ruleId === r.id && c.date === key));
    return {
      date: key,
      total: scheduled.length,
      done: assessed.filter((c) => c?.done).length,
      reviewed: scheduled.length > 0 && assessed.every((c) => c !== undefined),
    };
  });
  const reviewed = days.filter((d) => d.reviewed);
  const habits = rules
    .map((rule) => {
      const eligible = days.filter((d) => scheduledRules([rule], d.date).length);
      const recorded = eligible.flatMap((d) =>
        checks.filter((c) => c.ruleId === rule.id && c.date === d.date),
      );
      return {
        title: rule.title,
        recorded: recorded.length,
        missed: recorded.filter((c) => !c.done).length,
      };
    })
    .filter((h) => h.recorded > 0)
    .sort((a, b) => b.missed / b.recorded - a.missed / a.recorded);
  const groups = [...new Set(results.map((r) => r.currency))].map((currency) => {
    const group = (complete: boolean) => {
      const matched = results.filter(
        (r) =>
          r.currency === currency &&
          reviewed.some((d) => d.date === r.date && (d.done === d.total) === complete),
      );
      return {
        days: matched.length,
        trades: matched.reduce((s, r) => s + r.trades, 0),
        average: matched.length ? matched.reduce((s, r) => s + r.netPnl, 0) / matched.length : null,
      };
    };
    return { currency, complete: group(true), incomplete: group(false) };
  });
  return {
    from,
    reviewed: reviewed.length,
    scheduled: days.filter((d) => d.total > 0).length,
    complete: reviewed.filter((d) => d.done === d.total).length,
    habits,
    groups,
  };
}
