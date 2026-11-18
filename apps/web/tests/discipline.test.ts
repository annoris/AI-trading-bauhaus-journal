import { describe, it, expect } from "vitest";
import { disciplineReview } from "../src/lib/discipline";
import type { Routine } from "../src/lib/progress";
const rules = [
  {
    id: "a",
    title: "Define risk",
    stage: "Before trading",
    weekdays: [1, 2, 3, 4, 5],
    createdAt: "2026-09-01",
    archivedAt: null,
  },
] satisfies [Routine];
describe("discipline review", () => {
  it("separates absent check-ins from explicit incomplete days and keeps currencies separate", () => {
    const review = disciplineReview(
      rules,
      [
        { ruleId: "a", date: "2026-09-01", done: true },
        { ruleId: "a", date: "2026-09-02", done: false },
      ],
      "2026-09-03",
      [
        { date: "2026-09-01", netPnl: 100, trades: 2, currency: "USD" },
        { date: "2026-09-02", netPnl: -40, trades: 1, currency: "USD" },
        { date: "2026-09-03", netPnl: 999, trades: 1, currency: "USD" },
        { date: "2026-09-01", netPnl: 20, trades: 1, currency: "EUR" },
      ],
    );
    expect(review.reviewed).toBe(2);
    expect(review.scheduled).toBe(3);
    expect(review.complete).toBe(1);
    expect(review.groups[0]!.complete.average).toBe(100);
    expect(review.groups[0]!.incomplete.average).toBe(-40);
    expect(review.groups[1]!.complete.average).toBe(20);
    expect(review.habits[0]!.missed).toBe(1);
  });
  it("requires every scheduled routine to have a check and respects archive dates", () => {
    const additional = { ...rules[0], id: "b", archivedAt: "2026-09-02" };
    const review = disciplineReview(
      [...rules, additional],
      [
        { ruleId: "a", date: "2026-09-01", done: true },
        { ruleId: "a", date: "2026-09-02", done: true },
      ],
      "2026-09-02",
      [],
    );
    expect(review.reviewed).toBe(1);
    expect(review.complete).toBe(1);
  });
  it("does not include check-ins outside the 30-day window", () => {
    expect(
      disciplineReview(rules, [{ ruleId: "a", date: "2026-09-01", done: true }], "2026-10-01", [])
        .reviewed,
    ).toBe(0);
  });
});
