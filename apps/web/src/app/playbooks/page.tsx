"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, BookOpen, ArrowRight } from "lucide-react";
import { AdherenceReport } from "@/components/adherence-report";
import { FilterBar, useFilters } from "@/components/filter-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { postJson, useApi } from "@/lib/use-api";

interface Playbook {
  id: string;
  name: string;
  description: string;
  rules: string[];
  tradeCount: number;
}

export default function PlaybooksPage() {
  return (
    <Suspense>
      <Playbooks />
    </Suspense>
  );
}

function Playbooks() {
  const { query } = useFilters();
  const { data, refresh } = useApi<{ playbooks: Playbook[] }>("/api/playbooks");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");

  const create = async () => {
    await postJson("/api/playbooks", {
      name,
      description,
      rules: rules
        .split("\n")
        .map((rule) => rule.trim())
        .filter(Boolean),
    });
    setOpen(false);
    setName("");
    setDescription("");
    setRules("");
    refresh();
  };

  return (
    <div>
      <FilterBar
        title="Playbooks"
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus />
            New playbook
          </Button>
        }
      />
      <p className="px-6 pt-5 text-sm text-muted-foreground">
        Strategies, rules and checklists for consistent execution.
      </p>
      <div className="playbook-grid grid gap-4 p-4 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
        {data?.playbooks.length === 0 && (
          <p className="col-span-full py-16 text-center text-sm text-muted-foreground">
            A playbook is a setup you trade on purpose — name it, write its rules, then tag trades
            with it and let Reports tell you if it actually pays.
          </p>
        )}
        {data?.playbooks.map((playbook) => (
          <Card key={playbook.id} className="playbook-card">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-foreground text-base font-semibold">
                <span className="playbook-icon">
                  <BookOpen className="h-6 w-6" />
                </span>
                {playbook.name}
              </CardTitle>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {playbook.tradeCount} linked trades · all dates
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${playbook.name}`}
                  onClick={async () => {
                    if (
                      confirm(
                        `Delete "${playbook.name}"? Trades keep their data, just lose the link.`,
                      )
                    ) {
                      await postJson(`/api/playbooks/${playbook.id}`, undefined, "DELETE");
                      refresh();
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {playbook.description && (
                <p className="text-sm text-muted-foreground">{playbook.description}</p>
              )}
              {playbook.rules.length > 0 && (
                <ul className="playbook-rules space-y-3 text-sm">
                  {playbook.rules.map((rule, index) => (
                    <li key={index} className="flex min-w-0 gap-2 break-words">
                      <span className="playbook-rule-number">{index + 1}</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              )}
              <AdherenceReport bookId={playbook.id} />
              <Link
                className="playbook-trades-link"
                href={`/trades?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(query)), playbookId: playbook.id })}`}
              >
                View linked trades
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New playbook</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name (e.g. Opening range breakout)"
            />
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="One-line description"
            />
            <Textarea
              value={rules}
              onChange={(event) => setRules(event.target.value)}
              placeholder={
                "One rule per line:\nOnly A+ setups\nRisk max 1R\nNo entries after 11:30"
              }
              className="min-h-32"
            />
            <Button onClick={create} disabled={!name}>
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
