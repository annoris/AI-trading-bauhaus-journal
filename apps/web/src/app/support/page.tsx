"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Clock3, LifeBuoy, LockKeyhole, Send, ShieldAlert } from "lucide-react";
import { SupportStatusChip, type SupportStatus } from "@/components/support-status-chip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage, consumeRecentApiErrorReference } from "@/lib/api-error";
import { fmtDateTime } from "@/lib/utils";

type Category = "profile" | "journal" | "imports" | "ai" | "access" | "other";
type Report = {
  id: string;
  category: Category;
  subject: string;
  description: string;
  route: string;
  errorId: string;
  status: SupportStatus;
  ownerReply: string;
  createdAt: number;
  updatedAt: number;
};

export default function SupportPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [category, setCategory] = useState<Category>("profile");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [errorId, setErrorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/support/reports", { cache: "no-store" });
    const body = (await response.json()) as {
      reports?: Report[];
      error?: string;
      errorId?: string;
    };
    if (!response.ok) throw new Error(apiErrorMessage(body, response.status));
    setReports(body.reports ?? []);
  }, []);

  useEffect(() => {
    setErrorId(consumeRecentApiErrorReference());
    refresh()
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Could not load support reports."),
      )
      .finally(() => setLoading(false));
  }, [refresh]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/support/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          subject,
          description,
          route: window.location.pathname,
          errorId,
        }),
      });
      const body = (await response.json()) as { report?: Report; error?: string; errorId?: string };
      if (!response.ok || !body.report) {
        const errorMessage = apiErrorMessage(body, response.status);
        setErrorId(consumeRecentApiErrorReference());
        throw new Error(errorMessage);
      }
      setReports((current) => [body.report!, ...current]);
      setSubject("");
      setDescription("");
      setErrorId("");
      setMessage(`Report submitted. Reference ${body.report.id.slice(0, 8)}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit this report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl space-y-7 px-4 py-6 sm:px-7 sm:py-8">
      <header className="space-y-2 border-b border-border/80 pb-6">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
          <LifeBuoy className="h-3.5 w-3.5" /> Member support
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Report a problem</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Tell us what happened and we’ll review the page and time attached to your report.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-loss/25 bg-loss/5 px-4 py-3 text-sm text-loss"
        >
          {error}
        </div>
      )}
      {message && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-brand/25 bg-brand/5 px-4 py-3 text-sm text-brand"
        >
          <Check className="h-4 w-4" /> {message}
        </div>
      )}

      <Card className="overflow-hidden rounded-2xl border-border/80">
        <div className="flex items-start gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brand/5 text-brand">
            <ShieldAlert className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Issue details</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Your account and current page are attached automatically.
            </p>
          </div>
        </div>
        <CardContent className="p-5 sm:p-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
              <label className="space-y-1.5 text-xs font-medium">
                <span>What is the issue about?</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as Category)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-normal shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="profile">Profile or settings</option>
                  <option value="journal">Journal or trades</option>
                  <option value="imports">Import or connection</option>
                  <option value="ai">AI analysis</option>
                  <option value="access">Sign-in or access</option>
                  <option value="other">Something else</option>
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-medium">
                <span>Short summary</span>
                <Input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="What went wrong?"
                  minLength={4}
                  maxLength={120}
                  required
                  className="h-10 rounded-xl font-normal"
                />
              </label>
            </div>
            <label className="block space-y-1.5 text-xs font-medium">
              <span>What happened?</span>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the steps and what you expected to happen."
                minLength={10}
                maxLength={4000}
                required
                className="min-h-36 rounded-xl font-normal leading-6"
              />
              <span className="block text-[11px] font-normal text-muted-foreground">
                Please leave out passwords, payment details, and private trade notes.
              </span>
            </label>
            <label className="block space-y-1.5 text-xs font-medium">
              <span>Error reference (optional)</span>
              <Input
                value={errorId}
                onChange={(event) => setErrorId(event.target.value.trim().slice(0, 16))}
                placeholder="Shown beside some app errors"
                maxLength={16}
                className="h-10 font-mono text-sm font-normal"
              />
              <span className="block text-[11px] font-normal text-muted-foreground">
                If the app showed a reference code, it is filled here so the owner can find its
                redacted server event.
              </span>
            </label>
            <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <LockKeyhole className="h-3.5 w-3.5 text-brand" /> Your report is visible only to
                you and the owner.
              </p>
              <Button type="submit" disabled={submitting} className="h-10 rounded-xl px-4">
                <Send className="mr-2 h-4 w-4" /> {submitting ? "Sending…" : "Send report"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3" aria-labelledby="my-reports-title">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="my-reports-title" className="text-lg font-semibold tracking-tight">
              Your reports
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Replies and status updates appear here.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">{reports.length} recent</span>
        </div>
        <Card className="overflow-hidden rounded-2xl border-border/80">
          {loading ? (
            <div className="space-y-3 p-5" aria-label="Loading reports">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-3 w-64 animate-pulse rounded bg-muted" />
            </div>
          ) : reports.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl border border-border bg-muted/40 text-muted-foreground">
                <Clock3 className="h-4 w-4" />
              </span>
              <p className="mt-3 text-sm font-medium">No reports yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Reports you send will be listed here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border" role="list">
              {reports.map((report) => (
                <li key={report.id} className="space-y-3 p-4 sm:p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{report.subject}</p>
                        <SupportStatusChip status={report.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {report.category} · {report.route} · {fmtDateTime(report.createdAt)} · Ref{" "}
                        {report.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {report.description}
                  </p>
                  {report.ownerReply && (
                    <div className="rounded-xl border border-brand/20 bg-brand/5 p-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">
                        Owner reply
                      </p>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6">
                        {report.ownerReply}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </main>
  );
}
