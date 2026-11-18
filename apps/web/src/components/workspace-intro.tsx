"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
const pages: Record<
  string,
  { eyebrow: string; title: string; description: string; action: string; href: string }
> = {
  "/dashboard": {
    eyebrow: "YOUR TRADING WORKSPACE",
    title: "Make your next session count.",
    description:
      "See your results clearly. Review the decisions behind them. Build a process you can repeat.",
    action: "Review your discipline",
    href: "/progress",
  },
  "/calendar": {
    eyebrow: "ONE SESSION AT A TIME",
    title: "Every trading day tells a story.",
    description:
      "Look beyond the green and red. Open a session, revisit your decisions, and capture what you learned.",
    action: "Open your journal",
    href: "/journal",
  },
  "/trades": {
    eyebrow: "EXECUTION MATTERS",
    title: "Find the decisions worth repeating.",
    description:
      "Review entries, exits, risk and mistakes. Give each trade the context that a P&L number cannot show.",
    action: "Explore your performance",
    href: "/reports",
  },
  "/reports": {
    eyebrow: "KNOW YOUR PATTERNS",
    title: "Turn your history into a clearer plan.",
    description:
      "Compare strategies, timing and mistakes. Use the evidence in your journal to decide what deserves your attention.",
    action: "Review your strategies",
    href: "/playbooks",
  },
  "/journal": {
    eyebrow: "YOUR DAILY DEBRIEF",
    title: "The session ends. The learning stays.",
    description:
      "Write down what you saw, how you felt, and what you will do differently next time.",
    action: "Check your routines",
    href: "/progress",
  },
  "/progress": {
    eyebrow: "BUILD YOUR DISCIPLINE",
    title: "Show up with a process you trust.",
    description:
      "Prepare before the open. Stay deliberate during the session. Review afterward. Track your habits alongside your results.",
    action: "Review your trading days",
    href: "/calendar",
  },
  "/playbooks": {
    eyebrow: "TRADE WITH INTENT",
    title: "Know your setup before you take it.",
    description:
      "Define the conditions, write your rules, and review whether your execution matched your plan.",
    action: "Review your trades",
    href: "/trades",
  },
  "/notebook": {
    eyebrow: "SPACE TO THINK",
    title: "Keep the lessons that make you better.",
    description:
      "Build a personal library of session reviews, market observations and reminders you want to carry forward.",
    action: "See your daily journal",
    href: "/journal",
  },
  "/missed": {
    eyebrow: "LEARN FROM THE SIDELINES",
    title: "A missed trade can still teach you.",
    description:
      "Capture the setup, your hesitation, and the plan you saw. Keep opportunities separate from trades you actually took.",
    action: "Refine your playbook",
    href: "/playbooks",
  },
  "/accounts": {
    eyebrow: "YOUR ACCOUNTS, TOGETHER",
    title: "Give every account a clear place.",
    description: "Organize your trading history so you can review each account on its own terms.",
    action: "Import your trades",
    href: "/import",
  },
  "/import": {
    eyebrow: "START WITH YOUR TRADES",
    title: "Bring your trading story into Bauhaus.",
    description:
      "Choose your account, review your file, and check the numbers before adding them to your journal.",
    action: "Manage your accounts",
    href: "/accounts",
  },
  "/settings": {
    eyebrow: "MAKE IT YOURS",
    title: "A workspace that fits your process.",
    description:
      "Set your timezone, connections and journal preferences so your reviews reflect the way you trade.",
    action: "Back to your dashboard",
    href: "/dashboard",
  },
  "/prop-firms": {
    eyebrow: "YOUR FUNDED JOURNEY",
    title: "See what your trading journey really costs.",
    description:
      "Track evaluations, fees and payouts received. Keep actual cash separate from trading performance.",
    action: "Review your accounts",
    href: "/accounts",
  },
};
export function WorkspaceIntro() {
  const path = usePathname();
  const page = pages[path];
  if (!page) return null;
  return (
    <section className="workspace-intro" aria-label={`${page.eyebrow.toLowerCase()} introduction`}>
      <div>
        <p className="workspace-eyebrow">{page.eyebrow}</p>
        <h2>{page.title}</h2>
        <p className="workspace-description">{page.description}</p>
      </div>
      <Link className="workspace-intro-action" href={page.href}>
        {page.action}
        <ArrowUpRight size={16} />
      </Link>
    </section>
  );
}
