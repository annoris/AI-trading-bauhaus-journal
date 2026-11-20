"use client";

import { Badge } from "@/components/ui/badge";

export type SupportStatus = "open" | "in_progress" | "resolved";

export const SUPPORT_STATUS_LABEL: Record<SupportStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

export function SupportStatusChip({
  status,
  openTone = "muted",
}: {
  status: SupportStatus;
  openTone?: "loss" | "muted";
}) {
  const openClass =
    openTone === "loss"
      ? "rounded-full border-loss/25 bg-loss/10 text-loss"
      : "rounded-full border-border bg-muted text-muted-foreground";

  return (
    <Badge
      variant="outline"
      className={
        status === "resolved"
          ? "rounded-full border-brand/25 bg-brand/10 text-brand"
          : status === "in_progress"
            ? "rounded-full border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : openClass
      }
    >
      {SUPPORT_STATUS_LABEL[status]}
    </Badge>
  );
}
