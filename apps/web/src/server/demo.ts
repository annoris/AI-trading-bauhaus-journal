import { asc, eq } from "drizzle-orm";
import type { ImportedExecution } from "@trading-bauhaus/journal-importers";
import { accounts, db, tradeRuleChecks, trades } from "@/db";
import { insertExecutions } from "./executions";
import { setSetting } from "./settings";
import { newId, nowIso } from "./ids";

/** Demo accounts are tagged by broker so they can be found and deleted. */
export const DEMO_BROKER = "demo";
export const DEMO_PLAYBOOK_ID = "public-demo-nq-mnq-discipline";
export const DEMO_FOLDER_ID = "public-demo-notebook";
export const DEMO_PLAYBOOK_RULES = [
  "Trade NQ or MNQ only; choose one directional bias for the session and wait for the opening range, a retest, or a VWAP reclaim/reject.",
  "Place the stop before entry; planned risk = contracts × stop points × $20 for NQ or $2 for MNQ, capped at $150 before fees.",
  "Use 1 NQ or 1–2 MNQ in this sample; the fictional account cap is 1 NQ or 4 MNQ.",
  "Take no more than 2 trades per session. Stop after 2 consecutive losses or a $300 realized loss; the separate fictional hard daily loss limit is $500.",
  "Never add to a losing position or widen a stop. Record any early exit and review it against the plan.",
  "Check the fictional $2,000 trailing drawdown and $3,000 profit target before each session; actual firms use different rules.",
] as const;

const PROP_EVALUATION_ID = "public-demo-mnq-evaluation";
export const DEMO_PROP_EVALUATION_ID = PROP_EVALUATION_ID;

export const DEMO_RULES = {
  startingBalance: 50_000,
  profitTarget: 3_000,
  dailyLossLimit: 500,
  trailingDrawdown: 2_000,
  maxMicros: 4,
  maxNq: 1,
  maxTradesPerDay: 2,
} as const;

const MNQ_POINT_VALUE = 2;
const NQ_POINT_VALUE = 20;
const DEMO_SEED = 13870;

/** Deterministic RNG: synthetic records are repeatable when the demo is reseeded. */
const rng = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    return state / 2 ** 31;
  };
};

const roundToTick = (price: number) => Math.round(price * 4) / 4;

const sessionTime = (day: Date, minutesAfterOpen: number, second: number): string => {
  const totalMinutes = 9 * 60 + 30 + minutesAfterOpen;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const provisional = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
    hour,
    minute,
    second,
  );
  const parts = new Map(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(provisional))
      .map((part) => [part.type, part.value]),
  );
  const observedWallTime = Date.UTC(
    Number(parts.get("year")),
    Number(parts.get("month")) - 1,
    Number(parts.get("day")),
    Number(parts.get("hour")),
    Number(parts.get("minute")),
    Number(parts.get("second")),
  );
  const offset = observedWallTime - provisional;
  return new Date(provisional - offset).toISOString();
};

interface DemoReviewPlan {
  symbol: "NQ" | "MNQ";
  pointValue: number;
  feePerSide: number;
  setup: string;
  setupTag: string;
  quantity: number;
  stopPoints: number;
  targetPoints: number;
  lateEntry: boolean;
  earlyExit: boolean;
  slippedStop: boolean;
}

const SETUPS = [
  {
    name: "Opening range pullback",
    tag: "setup: opening-range-pullback",
    winChance: 0.64,
  },
  { name: "VWAP reclaim/reject", tag: "setup: vwap-reclaim", winChance: 0.55 },
  { name: "Breakout retest", tag: "setup: breakout-retest", winChance: 0.49 },
] as const;

const generateExecutions = (): { rows: ImportedExecution[]; plans: DemoReviewPlan[] } => {
  const random = rng(DEMO_SEED);
  const rows: ImportedExecution[] = [];
  const plans: DemoReviewPlan[] = [];
  const today = new Date();
  const startOfRange = Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1);
  const endOfRange = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  let wednesdays = 0;
  let losingDay = "";
  for (let timestamp = startOfRange; timestamp <= endOfRange; timestamp += 24 * 60 * 60 * 1000) {
    const candidate = new Date(timestamp);
    if (candidate.getUTCDay() === 3 && ++wednesdays === 2) {
      losingDay = candidate.toISOString().slice(0, 10);
      break;
    }
  }

  for (let timestamp = startOfRange; timestamp <= endOfRange; timestamp += 24 * 60 * 60 * 1000) {
    const day = new Date(timestamp);
    const weekday = day.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;

    const dayKey = day.toISOString().slice(0, 10);
    const forcedLosingDay = dayKey === losingDay;
    const tradesToday = forcedLosingDay ? 2 : random() < 0.38 ? 2 : 1;
    let minute = 4 + Math.floor(random() * 18);
    let consecutiveLosses = 0;
    const daysIntoRange = (timestamp - startOfRange) / (24 * 60 * 60 * 1000);
    const sessionReference = roundToTick(20_800 + daysIntoRange * 3 + random() * 34);
    const sessionLong = random() < 0.54;
    const symbol: "NQ" | "MNQ" = random() < 0.28 ? "NQ" : "MNQ";
    const pointValue = symbol === "NQ" ? NQ_POINT_VALUE : MNQ_POINT_VALUE;
    const quantity = symbol === "NQ" ? 1 : 1 + Math.floor(random() * 2);
    const feePerSide = quantity * (symbol === "NQ" ? 2.5 : 0.62);

    for (let tradeNumber = 0; tradeNumber < tradesToday; tradeNumber++) {
      const setup = SETUPS[Math.floor(random() * SETUPS.length)]!;
      const long = sessionLong;
      const entry = roundToTick(sessionReference + (random() - 0.5) * 28);
      const stopPoints =
        symbol === "NQ" ? 4 + Math.floor(random() * 3) : 8 + Math.floor(random() * 7);
      const targetPoints = roundToTick(stopPoints * (1.5 + random() * 0.5));
      const lateEntry = random() < 0.13;
      const adjustedWinChance = setup.winChance - (lateEntry ? 0.2 : 0);
      const wins = !forcedLosingDay && random() < adjustedWinChance;
      const earlyExit = wins && random() < 0.13;
      const slippedStop = !wins && random() < 0.16;
      const realizedPoints = wins
        ? earlyExit
          ? stopPoints * 0.75
          : targetPoints
        : -stopPoints * (slippedStop ? 1.125 : 1);
      const exit = roundToTick(entry + (long ? 1 : -1) * realizedPoints);
      const holdMinutes = 5 + Math.floor(random() * 22);
      const entryAt = sessionTime(day, minute, Math.floor(random() * 60));
      const exitAt = sessionTime(day, minute + holdMinutes, Math.floor(random() * 60));
      const entrySide = long ? "buy" : "sell";
      const exitSide = long ? "sell" : "buy";
      rows.push(
        {
          symbol,
          side: entrySide,
          quantity,
          price: entry,
          fee: feePerSide,
          executedAt: entryAt,
          assetClass: "futures",
        },
        {
          symbol,
          side: exitSide,
          quantity,
          price: exit,
          fee: feePerSide,
          executedAt: exitAt,
          assetClass: "futures",
        },
      );
      plans.push({
        symbol,
        pointValue,
        feePerSide,
        setup: setup.name,
        setupTag: setup.tag,
        quantity,
        stopPoints,
        targetPoints,
        lateEntry,
        earlyExit,
        slippedStop,
      });

      consecutiveLosses = wins ? 0 : consecutiveLosses + 1;
      if (consecutiveLosses >= 2) break;

      minute += holdMinutes + 8 + Math.floor(random() * 36);
      if (minute > 330) break;
    }
  }

  return { rows, plans };
};

export interface DemoResult {
  accountId: string;
  inserted: number;
  alreadyLoaded: boolean;
}

/** Idempotent loader for the isolated public-demo database. */
export const loadDemoData = (): DemoResult => {
  const existing = db.select().from(accounts).where(eq(accounts.broker, DEMO_BROKER)).get();
  if (existing) {
    if (existing.archivedAt)
      db.update(accounts).set({ archivedAt: null }).where(eq(accounts.id, existing.id)).run();
    return { accountId: existing.id, inserted: 0, alreadyLoaded: true };
  }

  const lastMonth = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 1, 1),
  );
  setSetting("multipliers", JSON.stringify({ MNQ: MNQ_POINT_VALUE, NQ: NQ_POINT_VALUE }));
  setSetting("timeZone", "America/New_York");
  setSetting(
    "publicDemoCalendarMonth",
    `${lastMonth.getUTCFullYear()}-${String(lastMonth.getUTCMonth() + 1).padStart(2, "0")}`,
  );
  const id = newId();
  db.insert(accounts)
    .values({
      id,
      name: "NQ / MNQ Prop Evaluation · Demo",
      broker: DEMO_BROKER,
      kind: "import",
      currency: "USD",
      initialBalance: DEMO_RULES.startingBalance,
      profitCalcMethod: "fifo",
      credentialsEnc: null,
      autoSync: false,
      createdAt: nowIso(),
    })
    .run();

  const generated = generateExecutions();
  const { inserted } = insertExecutions(id, generated.rows, "import", undefined, {
    preserveFees: true,
  });

  const sampleTrades = db
    .select()
    .from(trades)
    .where(eq(trades.accountId, id))
    .orderBy(asc(trades.openedAt))
    .all();
  db.transaction((tx) => {
    sampleTrades.forEach((trade, index) => {
      const plan = generated.plans[index];
      if (!plan) return;
      const long = trade.direction === "long";
      const stop = roundToTick(trade.avgEntry + (long ? -1 : 1) * plan.stopPoints);
      const target = roundToTick(trade.avgEntry + (long ? 1 : -1) * plan.targetPoints);
      const mistake = plan.lateEntry
        ? "late entry"
        : plan.earlyExit
          ? "early exit"
          : plan.slippedStop
            ? "stop slippage"
            : null;
      const review = [
        "SIMULATED PROP REVIEW · fictional NQ/MNQ record; this is not a real account or market history.",
        `PLAN: ${plan.setup} in ${long ? "long" : "short"}; entry ${trade.avgEntry.toFixed(2)}; stop ${stop.toFixed(2)}; target ${target.toFixed(2)}.`,
        `SESSION: ${plan.symbol}; the day's entries keep the same ${long ? "long" : "short"} bias.`,
        `RISK: ${plan.quantity} ${plan.symbol} contract${plan.quantity === 1 ? "" : "s"} × ${plan.stopPoints} points × $${plan.pointValue}/point = $${(plan.quantity * plan.stopPoints * plan.pointValue).toFixed(2)} planned risk before fees.`,
        `EXECUTION: ${mistake ? `Review flag: ${mistake}.` : "Entry and exit followed the written setup."} ${plan.earlyExit ? "The position was closed before the planned target." : plan.slippedStop ? "The stop exit includes a small simulated slip." : "The exit was at the sample target or planned stop."}`,
        `REVIEW: ${trade.netPnl >= 0 ? "Positive result" : "Loss"} of $${trade.netPnl.toFixed(2)} net of the simulated $${(plan.feePerSide / plan.quantity).toFixed(2)}-per-contract-per-side cost. Score the decision by rule adherence, not by this single outcome.`,
      ].join("\n\n");

      tx.update(trades)
        .set({
          notes: review,
          tagsJson: JSON.stringify([plan.symbol, "prop-evaluation", "planned-risk", plan.setupTag]),
          mistakesJson: JSON.stringify(mistake ? [mistake] : []),
          playbookId: DEMO_PLAYBOOK_ID,
          rating: mistake ? 3 : trade.netPnl >= 0 ? 5 : 4,
          stopLoss: stop,
          profitTarget: target,
          reviewedAt: trade.closedAt ?? trade.openedAt,
        })
        .where(eq(trades.key, trade.key))
        .run();
      tx.insert(tradeRuleChecks)
        .values(
          DEMO_PLAYBOOK_RULES.map((rule) => ({
            id: newId(),
            tradeKey: trade.key,
            playbookId: DEMO_PLAYBOOK_ID,
            rule,
            followed: true,
          })),
        )
        .run();
    });
  });

  return { accountId: id, inserted, alreadyLoaded: false };
};
