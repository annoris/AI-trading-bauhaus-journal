"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bug,
  Check,
  Clock3,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage } from "@/lib/api-error";

type Status = "open" | "in_progress" | "resolved";
type Report = {
  id: string;
  reporterId: string;
  reporterEmail: string;
  category: string;
  subject: string;
  description: string;
  route: string;
  errorId: string;
  status: Status;
  ownerReply: string;
  createdAt: number;
  updatedAt: number;
};
type Draft = { status: Status; ownerReply: string };
type ErrorEvent = {
  errorId: string;
  route: string;
  method: string;
  actor: "owner" | "member";
  occurredAt: number;
};

const statusLabel: Record<Status, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

function StatusChip({ status }: { status: Status }) {
  return (
    <Badge
      variant="outline"
      className={
        status === "resolved"
          ? "rounded-full border-brand/25 bg-brand/10 text-brand"
          : status === "in_progress"
            ? "rounded-full border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : "rounded-full border-loss/25 bg-loss/10 text-loss"
      }
    >
      {statusLabel[status]}
    </Badge>
  );
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function OwnerSupportPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [errorEvents, setErrorEvents] = useState<ErrorEvent[]>([]);
  const [errorCount, setErrorCount] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    const [response, errorResponse] = await Promise.all([
      fetch("/api/admin/support", { cache: "no-store" }),
      fetch("/api/admin/errors", { cache: "no-store" }),
    ]);
    const [body, errorBody] = await Promise.all([
      response.json() as Promise<{ reports?: Report[]; error?: string; errorId?: string }>,
      errorResponse.json() as Promise<{
        recent?: ErrorEvent[];
        last7Days?: number;
        error?: string;
        errorId?: string;
      }>,
    ]);
    if (!response.ok) throw new Error(apiErrorMessage(body, response.status));
    if (!errorResponse.ok) throw new Error(apiErrorMessage(errorBody, errorResponse.status));
    const nextReports = body.reports ?? [];
    setReports(nextReports);
    setErrorEvents(errorBody.recent ?? []);
    setErrorCount(errorBody.last7Days ?? 0);
    setDrafts(
      Object.fromEntries(
        nextReports.map((report) => [
          report.id,
          { status: report.status, ownerReply: report.ownerReply },
        ]),
      ),
    );
  }, []);

  useEffect(() => {
    refresh()
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Could not load support reports."),
      )
      .finally(() => setLoading(false));
  }, [refresh]);

  const refreshNow = async () => {
    setRefreshing(true);
    setError("");
    setMessage("");
    try {
      await refresh();
      setMessage("Support reports refreshed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not refresh support reports.");
    } finally {
      setRefreshing(false);
    }
  };

  const save = async (report: Report) => {
    const draft = drafts[report.id];
    if (!draft) return;
    setSavingId(report.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: report.id, status: draft.status, ownerReply: draft.ownerReply }),
      });
      const body = (await response.json()) as { report?: Report; error?: string; errorId?: string };
      if (!response.ok || !body.report) throw new Error(apiErrorMessage(body, response.status));
      setReports((current) => current.map((item) => (item.id === report.id ? body.report! : item)));
      setMessage(`Updated report ${report.id.slice(0, 8)}.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this report.");
    } finally {
      setSavingId(null);
    }
  };

  const openCount = reports.filter((report) => report.status === "open").length;
  const progressCount = reports.filter((report) => report.status === "in_progress").length;
  const resolvedCount = reports.filter((report) => report.status === "resolved").length;
  const filteredReports = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return reports.filter((report) => {
      const statusMatches = statusFilter === "all" || report.status === statusFilter;
      const queryMatches =
        !query ||
        `${report.reporterEmail} ${report.subject} ${report.description} ${report.route} ${report.errorId}`
          .toLocaleLowerCase()
          .includes(query);
      return statusMatches && queryMatches;
    });
  }, [reports, search, statusFilter]);

  const metrics = [
    { label: "Open", value: openCount, hint: "Needs review", icon: Bug },
    { label: "In progress", value: progressCount, hint: "Being handled", icon: Clock3 },
    { label: "Resolved", value: resolvedCount, hint: "Closed reports", icon: Check },
    { label: "App errors", value: errorCount, hint: "Last 7 days", icon: Activity },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl space-y-7 px-4 py-6 sm:px-7 sm:py-8">
      <header className="flex flex-col gap-5 border-b border-border/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
            <ShieldCheck className="h-3.5 w-3.5" /> Owner console
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Support & errors</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Review member-submitted issues, update their status, and leave a reply they can see in
            Support.
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            Review member reports and redacted server failures here. Browser errors are not captured
            automatically.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refreshNow()}
          disabled={loading || refreshing}
          className="h-10 rounded-xl px-3.5"
        >
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing" : "Refresh"}
        </Button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-loss/25 bg-loss/5 px-4 py-3 text-sm text-loss"
        >
          {error}
        </div>
      )}
      {message && !error && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-brand/25 bg-brand/5 px-4 py-3 text-sm text-brand"
        >
          <Check className="h-4 w-4" /> {message}
        </div>
      )}

      <section aria-label="Support summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map(({ label, value, hint, icon: Icon }) => (
          <Card key={label} className="rounded-2xl border-border/80">
            <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/15 bg-brand/5 text-brand">
                <Icon className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-3" aria-labelledby="app-errors-title">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="app-errors-title" className="text-lg font-semibold tracking-tight">
              Recent app errors
            </h2>
            <Badge variant="secondary" className="rounded-full px-2.5">
              {errorCount} in 7 days
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            The count covers 7 days; this list covers up to 30 days and is capped at 20,000 events.
            Technical details include no request content or trade data.
          </p>
        </div>
        <Card className="overflow-hidden rounded-2xl border-border/80">
          {errorEvents.length === 0 ? (
            <CardContent className="px-5 py-7 text-center text-sm text-muted-foreground">
              No recorded server errors.
            </CardContent>
          ) : (
            <div className="divide-y divide-border/70">
              {errorEvents.map((event) => (
                <div
                  key={event.errorId}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-medium">{event.route}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {event.method} · {event.actor} · Ref {event.errorId}
                    </p>
                  </div>
                  <time className="shrink-0 text-[11px] text-muted-foreground">
                    {formatDate(event.occurredAt)}
                  </time>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section className="space-y-3" aria-labelledby="support-queue-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="support-queue-title" className="text-lg font-semibold tracking-tight">
                Report queue
              </h2>
              <Badge variant="secondary" className="rounded-full px-2.5">
                {reports.length} total
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              The report contains the submitted text, page route, account email, and timestamp.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[150px_minmax(220px,280px)]">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | Status)}
              aria-label="Filter support reports by status"
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search email, route, summary"
                aria-label="Search support reports"
                className="h-10 rounded-xl pl-9"
              />
            </label>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <Card className="rounded-2xl border-border/80">
              <CardContent className="space-y-3 p-5" aria-label="Loading reports">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-3 w-64 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ) : reports.length === 0 ? (
            <Card className="rounded-2xl border-border/80">
              <CardContent className="px-5 py-10 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-border bg-muted/40 text-muted-foreground">
                  <Mail className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-semibold">No member reports yet</h3>
                <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-muted-foreground">
                  New reports appear here with the account and page context the member submitted.
                </p>
              </CardContent>
            </Card>
          ) : filteredReports.length === 0 ? (
            <Card className="rounded-2xl border-border/80">
              <CardContent className="px-5 py-8 text-center text-sm text-muted-foreground">
                No reports match these filters.
              </CardContent>
            </Card>
          ) : (
            filteredReports.map((report) => {
              const draft = drafts[report.id] ?? {
                status: report.status,
                ownerReply: report.ownerReply,
              };
              return (
                <Card key={report.id} className="overflow-hidden rounded-2xl border-border/80">
                  <CardContent className="space-y-4 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold">{report.subject}</h3>
                          <StatusChip status={report.status} />
                          <Badge variant="outline" className="rounded-full capitalize">
                            {report.category}
                          </Badge>
                        </div>
                        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <UserRound className="h-3.5 w-3.5" />
                            {report.reporterEmail}
                          </span>
                          <span>{report.route}</span>
                          <span>{formatDate(report.createdAt)}</span>
                          <span>Ref {report.id.slice(0, 8)}</span>
                          {report.errorId && (
                            <span className="font-mono">Error {report.errorId}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap rounded-xl border border-border/70 bg-muted/20 p-3.5 text-sm leading-6">
                      {report.description}
                    </p>
                    <div className="grid gap-3 border-t border-border/70 pt-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                      <label className="space-y-1.5 text-xs font-medium">
                        <span>Report status</span>
                        <select
                          value={draft.status}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [report.id]: { ...draft, status: event.target.value as Status },
                            }))
                          }
                          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </label>
                      <label className="space-y-1.5 text-xs font-medium">
                        <span>Reply shown to the member</span>
                        <Textarea
                          value={draft.ownerReply}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [report.id]: { ...draft, ownerReply: event.target.value },
                            }))
                          }
                          maxLength={4000}
                          placeholder="Write an update or resolution…"
                          className="min-h-20 rounded-xl text-sm font-normal"
                        />
                      </label>
                    </div>
                    <div className="flex flex-col gap-3 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[11px] leading-5 text-muted-foreground">
                        Replies appear in the member’s Support page; this does not send email.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void save(report)}
                        disabled={savingId !== null}
                        className="h-9 rounded-lg"
                      >
                        {savingId === report.id ? (
                          <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-3.5 w-3.5" />
                        )}
                        {savingId === report.id ? "Saving…" : "Save update"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
