"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { postJson, useApi } from "@/lib/use-api";
import { AiNotice } from "./ai-notice";
import { useFilters } from "./filter-bar";
import { useAiRequest, type AiScope } from "@/lib/use-ai-request";
import type { AnalysisFilters } from "@trading-bauhaus/journal-core";

const SUGGESTIONS = [
  "What's my most expensive mistake?",
  "How does my performance vary by weekday?",
  "Which strategies perform best, and how many trades support that result?",
  "What risk information is missing from my journal?",
  "Am I better at longs or shorts?",
];

/** Natural-language questions against your own aggregates — BYO AI provider key. */
export function AskJournal({
  context = "",
  suggestions = SUGGESTIONS,
  title = "Ask your journal",
}: { context?: string; suggestions?: string[]; title?: string } = {}) {
  const { values, query, timeZone } = useFilters();
  return (
    <ScopedAskJournal
      key={`${timeZone}:${query}`}
      filters={values}
      timeZone={timeZone}
      context={context}
      suggestions={suggestions}
      title={title}
    />
  );
}

function ScopedAskJournal({
  filters,
  timeZone,
  context,
  suggestions,
  title,
}: {
  filters: AnalysisFilters;
  timeZone: string;
  context: string;
  suggestions: string[];
  title: string;
}) {
  const { data: settings } = useApi<{ aiConfigured: boolean }>("/api/settings");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ answer: string; scope: AiScope } | null>(null);
  const { run, busy, error, dismiss } = useAiRequest();
  const [lastQuestion, setLastQuestion] = useState("");

  const ask = async (q: string) => {
    if (busy || !settings?.aiConfigured || !q.trim()) return;
    q = q.trim();
    setLastQuestion(q);
    setAnswer(null);
    await run(
      () =>
        postJson<{ answer: string; scope: AiScope }>("/api/ai/ask", {
          question: context ? `${context}\n\nTrader request: ${q}` : q,
          filters,
          timeZone,
        }),
      setAnswer,
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Analyzes your recorded trades using the selected accounts and filters. Requests are sent
          to your configured AI provider when you ask. Changing filters clears the answer.
        </p>
        {settings && !settings.aiConfigured && (
          <p className="rounded-lg border bg-muted/30 p-3 text-xs">
            AI is not configured.{" "}
            <Link href="/settings#ai-settings" className="text-brand underline">
              Set up AI in Settings
            </Link>{" "}
            to analyze your journal.
          </p>
        )}
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (question.trim()) void ask(question);
          }}
        >
          <Input
            aria-label="Ask your journal a question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Why do my Monday shorts keep failing?"
          />
          <Button type="submit" disabled={busy || !settings?.aiConfigured || !question.trim()}>
            <Sparkles />
            {busy ? "Thinking…" : "Ask"}
          </Button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              disabled={busy || !settings?.aiConfigured}
              className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent disabled:cursor-wait disabled:opacity-50"
              onClick={() => {
                setQuestion(suggestion);
                void ask(suggestion);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
        {error && (
          <AiNotice error={error} onRetry={() => void ask(lastQuestion)} onDismiss={dismiss} />
        )}
        {answer && (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-muted-foreground">{answer.scope.label}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer.answer}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
