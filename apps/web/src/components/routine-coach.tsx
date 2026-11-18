"use client";
import { useState } from "react";
import { AskJournal } from "./ask-journal";
import { Input } from "./ui/input";
import type { Routine } from "@/lib/progress";
const suggestions = [
  "Suggest three practical routines for my profile, one before, during and after trading. Explain the evidence and give a measurable completion criterion.",
  "Review my current routines and suggest one improvement based on my recorded mistakes.",
];
export function RoutineCoach({ rules }: { rules: Routine[] }) {
  const [experience, setExperience] = useState("Developing trader");
  const [style, setStyle] = useState("Day trading");
  const [goal, setGoal] = useState("");
  const [minutes, setMinutes] = useState("15");
  const context = `Routine coaching context. Self-reported profile: ${experience}; style: ${style}; daily review time: ${minutes} minutes; goal: ${goal.slice(0, 300) || "Not specified"}. Current active routine titles: ${JSON.stringify(rules.filter((r) => !r.archivedAt).map((r) => ({ title: r.title, stage: r.stage }))).slice(0, 1200)}. This profile is self-reported, not inferred from P&L. Use recorded journal aggregates as evidence, state sample limitations, do not infer personality or mental health. Suggest habits, not trade signals or position sizes. Never claim a routine was completed or promise returns. Distinguish observations from suggestions. Do not duplicate current routines. Suggestions require manual review and addition by the trader.`;
  return (
    <details className="reports-ai-card">
      <summary>
        <span>AI routine coach</span>
        <span className="text-xs text-muted-foreground">
          Personalize suggestions to your profile
        </span>
      </summary>
      <div className="space-y-4 pt-4">
        <p className="text-xs text-muted-foreground">
          Your profile and active routine titles are sent with selected trade aggregates only when
          you ask. Profile fields apply to this visit. Suggestions do not create or complete
          routines automatically.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-xs">
            Experience
            <select
              className="h-10 w-full rounded-lg border bg-card px-3"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
            >
              {["New trader", "Developing trader", "Experienced trader"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs">
            Trading style
            <select
              className="h-10 w-full rounded-lg border bg-card px-3"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
            >
              {["Scalping", "Day trading", "Swing trading", "Position trading"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs">
            Daily review minutes
            <Input
              type="number"
              min="1"
              max="180"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs">
            Main goal
            <Input
              maxLength={300}
              placeholder="e.g. Avoid early entries"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </label>
        </div>
        <AskJournal
          key={context}
          context={context}
          suggestions={suggestions}
          title="Suggest routines with AI"
        />
        <p className="text-xs text-muted-foreground">
          Review the suggestions, then use Add routine to choose the title, stage and schedule.
          Routine completion remains your confirmation.
        </p>
      </div>
    </details>
  );
}
