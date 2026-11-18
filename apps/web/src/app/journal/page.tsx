"use client";

import Link from "next/link";
import { dayKeyOf } from "@trading-bauhaus/journal-core";
import { Suspense, useEffect, useState } from "react";
import {
  NotebookPen,
  Search,
  ArrowLeftRight,
  Trophy,
  ListChecks,
  ChevronRight,
  CalendarDays,
  List,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import type { DayStats } from "@trading-bauhaus/journal-core";
import { FilterBar, useFilters } from "@/components/filter-bar";
import { Pnl } from "@/components/pnl";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Loading from "@/app/loading";
import { useApi } from "@/lib/use-api";
import { fmtPercent } from "@/lib/utils";

interface JournalDay {
  date: string;
  symbols: string[];
  tags: string[];
  curve: number[];
  stats: DayStats | null;
  hasNote: boolean;
  notePreview: string;
}

const PAGE_SIZE = 50;
const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  timeZone: "UTC",
});

export default function JournalPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Journal />
    </Suspense>
  );
}

function Journal() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [notes, setNotes] = useState("all");
  const { query, timeZone } = useFilters();
  const { data, error, refresh } = useApi<{ days: JournalDay[] }>(`/api/journal?${query}`);
  // Reset the visible window immediately when filters change. Keep every day
  // available without mounting years of cards on the first render.
  const [visibleWindow, setVisibleWindow] = useState({ query, limit: PAGE_SIZE });
  const limit = visibleWindow.query === query ? visibleWindow.limit : PAGE_SIZE;
  useEffect(() => setVisibleWindow({ query, limit: PAGE_SIZE }), [query]);

  const days = (data?.days ?? [])
    .filter(
      (day) =>
        (notes === "all" || (notes === "with" ? day.hasNote : !day.hasNote)) &&
        [day.date, day.notePreview, ...(day.symbols ?? []), ...(day.tags ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "pnl"
        ? (b.stats?.netPnl ?? 0) - (a.stats?.netPnl ?? 0)
        : sort === "oldest"
          ? a.date.localeCompare(b.date)
          : b.date.localeCompare(a.date),
    );
  return (
    <div>
      <FilterBar
        title="Daily journal"
        actions={
          <Link
            href={`/journal/${dayKeyOf(new Date().toISOString(), timeZone)}?${query}`}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            View my day
          </Link>
        }
      />
      <div className="journal-day-list space-y-2 p-4">
        <p className="mb-4 text-sm text-muted-foreground">
          Review each session, understand your results, and build better habits.
        </p>
        <div className="journal-list-toolbar">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search journal days"
              placeholder="Search days, notes, symbols, tags…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleWindow({ query, limit: PAGE_SIZE });
              }}
              className="pl-9"
            />
          </div>
          <select
            aria-label="Filter notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          >
            <option value="all">All days</option>
            <option value="with">With notes</option>
            <option value="without">Without notes</option>
          </select>
          <select
            aria-label="Sort journal days"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Date (newest)</option>
            <option value="oldest">Date (oldest)</option>
            <option value="pnl">Highest P&amp;L</option>
          </select>
          <span className="journal-list-view">
            <List className="h-4 w-4" /> List
          </span>
          <Link href={`/calendar?${query}`} className="journal-list-calendar">
            <CalendarDays className="h-4 w-4" /> Calendar
          </Link>
        </div>
        {error ? (
          <div role="alert" className="space-y-2 text-sm text-destructive">
            <p>{error}</p>
            <Button variant="outline" onClick={refresh}>
              Try again
            </Button>
          </div>
        ) : !data ? (
          <div role="status" aria-label="Loading journal">
            <Skeleton className="h-48" />
          </div>
        ) : null}
        {data?.days.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No trading days yet — import trades or write your first day note.
          </p>
        )}
        {data && days.length === 0 && data.days.length > 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No days match your search.
          </p>
        )}
        {days.slice(0, limit).map((day) => {
          const date = new Date(`${day.date}T00:00:00Z`);
          return (
            <Link key={day.date} href={`/journal/${day.date}?${query}`} className="journal-day-row">
              <div className="journal-day-date">
                <span>
                  {date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}{" "}
                  {date.getUTCFullYear()}
                </span>
                <strong>{String(date.getUTCDate()).padStart(2, "0")}</strong>
                <span>{weekdayFormatter.format(date)}</span>
              </div>
              <div className="journal-day-pnl">
                <span className="text-xs text-muted-foreground">Net P&amp;L</span>
                <Pnl value={day.stats?.netPnl ?? 0} className="text-xl font-semibold" />
              </div>
              <span className="journal-day-stat">
                <ArrowLeftRight />
                {day.stats?.trades ?? 0} trades
              </span>
              <span className="journal-day-stat">
                <Trophy />
                {fmtPercent(day.stats?.trades ? day.stats.wins / day.stats.trades : null, 0)} win
              </span>
              <span className="journal-day-stat">
                <ListChecks />
                {day.stats?.wins ?? 0}W / {day.stats?.losses ?? 0}L
                {day.stats?.breakevens ? ` / ${day.stats.breakevens} BE` : ""}
              </span>
              <div className="journal-day-tags">
                {(day.tags ?? []).slice(0, 1).map((tag) => (
                  <span className="journal-day-tag" key={tag}>
                    {tag}
                  </span>
                ))}
                {(day.symbols ?? []).slice(0, 2).map((symbol) => (
                  <span key={symbol}>{symbol}</span>
                ))}
              </div>
              <DayCurve values={day.curve ?? []} />
              <span className="journal-day-stat journal-day-note">
                <NotebookPen />
                {day.hasNote ? "Day note" : "No day note"}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          );
        })}
        {data && days.length > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-3 py-2 text-xs text-muted-foreground">
            <span role="status">
              Showing {Math.min(limit, days.length)} of {days.length} days
            </span>
            {limit < days.length && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleWindow({ query, limit: limit + PAGE_SIZE })}
              >
                Show older days
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DayCurve({ values }: { values: number[] }) {
  if (values.length < 2)
    return <div className="journal-day-curve text-xs text-muted-foreground">No closed trades</div>;
  const min = Math.min(...values),
    max = Math.max(...values),
    span = max - min || 1;
  const points = values
    .map((v, i) => `${4 + (i / (values.length - 1)) * 152},${44 - ((v - min) / span) * 36}`)
    .join(" ");
  return (
    <svg
      className="journal-day-curve"
      viewBox="0 0 160 52"
      role="img"
      aria-label="Cumulative realized P&L within this day"
      style={{ color: (values[values.length - 1] ?? 0) < 0 ? "var(--loss)" : "var(--brand)" }}
    >
      <polygon points={`4,52 ${points} 156,52`} fill="currentColor" opacity="0.08" />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
