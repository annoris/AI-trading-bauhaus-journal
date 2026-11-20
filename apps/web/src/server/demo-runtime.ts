import { asc, eq } from "drizzle-orm";
import { dayKeyOf } from "@trading-bauhaus/journal-core";
import {
  accounts,
  attachments,
  db,
  executions,
  folders,
  importBatches,
  importSourceAliases,
  importSources,
  journalDays,
  marketCsvDatasets,
  missedTrades,
  notes,
  playbooks,
  propAccounts,
  propAudit,
  propEntries,
  propReceipts,
  progressChecks,
  progressRules,
  runWithDemoDatabase,
  settings,
  tradeExcursions,
  tradeRuleChecks,
  trades,
} from "@/db";
import {
  DEMO_BROKER,
  DEMO_FOLDER_ID,
  DEMO_PLAYBOOK_ID,
  DEMO_PLAYBOOK_RULES,
  DEMO_PROP_EVALUATION_ID,
  DEMO_RULES,
  loadDemoData,
} from "@/server/demo";
import { nowIso } from "@/server/ids";
import { getTimeZone } from "@/server/settings";

const DEMO_NOTE_IDS = [
  "public-demo-ai-review",
  "public-demo-firm-overview",
  "public-demo-firm-topstep",
  "public-demo-firm-apex",
  "public-demo-firm-tpt",
  "public-demo-firm-mff",
  "public-demo-firm-earn2trade",
] as const;
const DEMO_SEED_SETTING = "publicDemoSeedVersion";
const DEMO_SEED_VERSION = "9";
const DEMO_PROP_FUNDED_ID = "public-demo-nq-mnq-funded";
const FIRM_RESEARCH_CHECKED = "November 2, 2026";
const DEMO_ROUTINES = [
  {
    id: "public-demo-routine-prep",
    stage: "Before trading",
    title: "Mark the opening range and choose one bias before the first entry.",
  },
  {
    id: "public-demo-routine-risk",
    stage: "During trading",
    title: "Take only a planned setup; stop after two trades or two consecutive losses.",
  },
  {
    id: "public-demo-routine-review",
    stage: "After trading",
    title: "Review each entry and write one takeaway before ending the session.",
  },
] as const;

let seedPromise: Promise<void> | null = null;

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

/** Clear only the isolated public-demo journal while upgrading its synthetic dataset. */
function resetPublicDemoContent() {
  db.transaction((tx) => {
    tx.delete(propReceipts).run();
    tx.delete(propEntries).run();
    tx.delete(propAccounts).run();
    tx.delete(propAudit).run();
    tx.delete(tradeRuleChecks).run();
    tx.delete(tradeExcursions).run();
    tx.delete(progressChecks).run();
    tx.delete(progressRules).run();
    tx.delete(missedTrades).run();
    tx.delete(attachments).run();
    tx.delete(notes).run();
    tx.delete(journalDays).run();
    tx.delete(executions).run();
    tx.delete(trades).run();
    tx.delete(importSourceAliases).run();
    tx.delete(importBatches).run();
    tx.delete(importSources).run();
    tx.delete(accounts).run();
    tx.delete(playbooks).run();
    tx.delete(folders).run();
    tx.delete(marketCsvDatasets).run();
    tx.delete(settings).run();
  });
}

function createFolder() {
  db.insert(folders)
    .values({
      id: DEMO_FOLDER_ID,
      name: "Prop firm research · demo",
      kind: "system",
      createdAt: "2026-01-01T00:00:00.000Z",
      deletedAt: null,
    })
    .onConflictDoNothing()
    .run();
}

function seedPlaybook(createdAt: string) {
  db.insert(playbooks)
    .values({
      id: DEMO_PLAYBOOK_ID,
      name: "NQ / MNQ Evaluation Process · Demo",
      description:
        "Fictional process checklist for the NQ/MNQ sample journal. This is a demo policy, not an official rule set from any prop firm.",
      rulesJson: JSON.stringify(DEMO_PLAYBOOK_RULES),
      createdAt,
    })
    .onConflictDoNothing()
    .run();
}

function seedPropEvaluation(accountId: string, firstDate: string, now: string) {
  const dateAtOffset = (offset: number) => {
    const date = new Date(`${firstDate}T12:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const evaluationPassDate = dateAtOffset(26);
  const fundedStartDate = dateAtOffset(27);
  const plannedPayoutDate = dateAtOffset(29);
  const payoutDate = plannedPayoutDate > today ? today : plannedPayoutDate;
  const rules = [
    `Starting balance: ${money(DEMO_RULES.startingBalance)}`,
    `Profit target: ${money(DEMO_RULES.profitTarget)}`,
    `Illustrative daily loss limit: ${money(DEMO_RULES.dailyLossLimit)}`,
    `Illustrative trailing drawdown: ${money(DEMO_RULES.trailingDrawdown)}`,
    `Illustrative max size: ${DEMO_RULES.maxNq} NQ or ${DEMO_RULES.maxMicros} MNQ contracts`,
    `Sample process cap: ${DEMO_RULES.maxTradesPerDay} trades per session`,
  ];
  db.insert(propAccounts)
    .values({
      id: DEMO_PROP_EVALUATION_ID,
      firm: "Illustrative Futures Program",
      name: "NQ / MNQ $50K evaluation · fictional sample",
      program: "evaluation",
      status: "passed",
      currency: "USD",
      sizeMinor: DEMO_RULES.startingBalance * 100,
      parentId: null,
      journalAccountId: accountId,
      openedOn: firstDate,
      closedOn: evaluationPassDate,
      renewalOn: null,
      renewalMinor: null,
      notes: [
        "PUBLIC DEMO RECORD — Fictional example only. This evaluation passed in the sample and has a separate linked funded stage. No firm affiliation, actual fee, payout, or claim of being funded.",
        ...rules,
        "The generated trades are synthetic and do not recreate any live prop firm's rules. Review the selected firm's current contract and dashboard before trading.",
      ].join("\n"),
      archived: false,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run();

  db.insert(propAccounts)
    .values({
      id: DEMO_PROP_FUNDED_ID,
      firm: "Illustrative Futures Program",
      name: "NQ / MNQ $50K funded · fictional sample",
      program: "funded",
      status: "active",
      currency: "USD",
      sizeMinor: DEMO_RULES.startingBalance * 100,
      parentId: DEMO_PROP_EVALUATION_ID,
      journalAccountId: accountId,
      openedOn: fundedStartDate,
      closedOn: null,
      renewalOn: dateAtOffset(58),
      renewalMinor: 2_900,
      notes: [
        "PUBLIC DEMO RECORD — This linked funded stage is fictional. Its sample payout and account history are not a real firm's rules or a real trader's result.",
        "The ledger shows a received sample payout plus one separate request still pending. Pending money is not included in received cash.",
        `A fictional $29 prop-program account subscription is recorded for the funded stage; its next reminder is ${dateAtOffset(58)}. The reminder is not a charge.`,
      ].join("\n"),
      archived: false,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run();

  const expense = (values: {
    id: string;
    category: string;
    amountMinor: number;
    occurredOn: string;
    reference: string;
    notes: string;
    accountId?: string;
  }) => ({
    ...values,
    accountId: values.accountId ?? DEMO_PROP_EVALUATION_ID,
    firm: "Illustrative Futures Program",
    kind: "expense" as const,
    currency: "USD",
    splitBps: 10_000,
    feeMinor: 0,
    dueOn: null,
    status: "completed",
    parentId: null,
    voided: false,
    revision: 1,
    createdAt: now,
    updatedAt: now,
  });
  const evaluationFeeId = "public-demo-fee-evaluation";
  const payoutId = "public-demo-payout-received";
  const pendingPayoutId = "public-demo-payout-pending";
  db.insert(propEntries)
    .values([
      expense({
        id: evaluationFeeId,
        category: "evaluation",
        amountMinor: 9_900,
        occurredOn: firstDate,
        reference: "DEMO-EVAL-001",
        notes: "Fictional $99 evaluation fee used only to demonstrate the cash ledger.",
      }),
      expense({
        id: "public-demo-fee-reset",
        category: "reset",
        amountMinor: 4_900,
        occurredOn: dateAtOffset(7),
        reference: "DEMO-RESET-001",
        notes: "Fictional $49 reset cost for the sample evaluation.",
      }),
      expense({
        id: "public-demo-fee-platform",
        accountId: DEMO_PROP_FUNDED_ID,
        category: "subscription",
        amountMinor: 2_900,
        occurredOn: fundedStartDate,
        reference: "DEMO-SUB-001",
        notes:
          "Fictional $29 prop-program account subscription for the sample funded stage. The next renewal is only a reminder until recorded.",
      }),
      {
        id: "public-demo-refund-evaluation",
        accountId: DEMO_PROP_EVALUATION_ID,
        firm: "Illustrative Futures Program",
        kind: "refund",
        category: "evaluation",
        currency: "USD",
        amountMinor: 9_900,
        splitBps: 10_000,
        feeMinor: 0,
        occurredOn: payoutDate,
        dueOn: null,
        status: "completed",
        parentId: evaluationFeeId,
        reference: "DEMO-REFUND-001",
        notes: "Fictional sample refund of the original evaluation fee after the first payout.",
        voided: false,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: payoutId,
        accountId: DEMO_PROP_FUNDED_ID,
        firm: "Illustrative Futures Program",
        kind: "payout",
        category: "payout",
        currency: "USD",
        amountMinor: 25_000,
        splitBps: 9_000,
        feeMinor: 500,
        occurredOn: payoutDate,
        dueOn: payoutDate,
        status: "completed",
        parentId: null,
        reference: "DEMO-PAYOUT-001",
        notes:
          "Fictional $250 gross request; sample 90% share less a $5 transfer fee = $220 received.",
        voided: false,
        revision: 2,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: pendingPayoutId,
        accountId: DEMO_PROP_FUNDED_ID,
        firm: "Illustrative Futures Program",
        kind: "payout",
        category: "payout",
        currency: "USD",
        amountMinor: 15_000,
        splitBps: 9_000,
        feeMinor: 500,
        occurredOn: today,
        dueOn: dateAtOffset(37) > today ? dateAtOffset(37) : today,
        status: "requested",
        parentId: null,
        reference: "DEMO-PAYOUT-002",
        notes: "Fictional request awaiting review; excluded from payouts received until settled.",
        voided: false,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      },
    ])
    .run();
  db.insert(propReceipts)
    .values({
      id: "public-demo-receipt-payout-001",
      payoutId,
      kind: "receipt",
      amountMinor: 22_000,
      occurredOn: payoutDate,
      reference: "DEMO-RECEIPT-001",
      notes: "Fictional sample settlement after the illustrative split and fee.",
      voided: false,
      createdAt: now,
    })
    .run();
}

function seedProgress(firstDate: string, today: string) {
  db.insert(progressRules)
    .values(
      DEMO_ROUTINES.map((routine) => ({
        ...routine,
        weekdaysJson: JSON.stringify([1, 2, 3, 4, 5]),
        createdAt: firstDate,
        archivedAt: null,
      })),
    )
    .run();

  const start = new Date(`${firstDate}T12:00:00.000Z`).getTime();
  const end = new Date(`${today}T12:00:00.000Z`).getTime();
  let weekdayIndex = 0;
  const checks: (typeof progressChecks.$inferInsert)[] = [];
  for (let timestamp = start; timestamp <= end; timestamp += 86_400_000) {
    const date = new Date(timestamp).toISOString().slice(0, 10);
    const weekday = new Date(timestamp).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    DEMO_ROUTINES.forEach((routine, index) => {
      const done = index === 1 || (index === 0 ? weekdayIndex % 6 !== 4 : weekdayIndex % 7 !== 5);
      checks.push({ id: `${routine.id}:${date}`, ruleId: routine.id, date, done });
    });
    weekdayIndex++;
  }
  db.insert(progressChecks).values(checks).run();
}

function seedMissedExamples(byDate: Map<string, (typeof trades.$inferSelect)[]>, now: string) {
  const sessions = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
  const redSession = sessions.find(
    ([, dayTrades]) => dayTrades.length === 2 && dayTrades.every((trade) => trade.netPnl < 0),
  );
  const singleTradeSession = sessions.find(
    ([date, dayTrades]) => date !== redSession?.[0] && dayTrades.length === 1,
  );
  const examples = [redSession, singleTradeSession].filter(
    (value): value is [string, (typeof trades.$inferSelect)[]] => Boolean(value),
  );
  const rows = examples.map(([date, dayTrades], index) => {
    const source = dayTrades[0]!;
    const long = source.direction === "long";
    const symbol = index === 0 ? "NQ" : "MNQ";
    const entry = source.avgEntry + (long ? 2 : -2);
    return {
      id: `public-demo-missed-${index + 1}`,
      symbol,
      direction: source.direction,
      observedAt: `${date}T16:10:00.000Z`,
      playbookId: DEMO_PLAYBOOK_ID,
      entry: Math.round(entry * 4) / 4,
      stop: Math.round((entry + (long ? -6 : 6)) * 4) / 4,
      target: Math.round((entry + (long ? 12 : -12)) * 4) / 4,
      notes:
        index === 0
          ? "OBSERVATION ONLY — After two planned losses, a later setup appeared in the same direction. The daily stop was already reached, so it was logged and deliberately not traded. It adds no trade or P&L."
          : "OBSERVATION ONLY — The opening-range move did not give a clean retest. I skipped it instead of chasing the price. Planned levels are for review only; no order was placed and no P&L is recorded.",
      createdAt: now,
      archivedAt: null,
    };
  });
  if (rows.length) db.insert(missedTrades).values(rows).run();
}

function buildAiReview(tradeRows: (typeof trades.$inferSelect)[]) {
  const closed = tradeRows.filter((trade) => trade.status !== "open" && trade.closedAt);
  const total = closed.reduce((sum, trade) => sum + trade.netPnl, 0);
  const wins = closed.filter((trade) => trade.netPnl > 0).length;
  const grossWin = closed.reduce((sum, trade) => sum + Math.max(0, trade.netPnl), 0);
  const grossLoss = -closed.reduce((sum, trade) => sum + Math.min(0, trade.netPnl), 0);
  const winRate = closed.length ? wins / closed.length : 0;
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : 0;

  const setupTotals = new Map<string, { count: number; net: number }>();
  const mistakes = new Map<string, { count: number; net: number }>();
  const daily = new Map<string, number>();
  let equity = 0;
  let peak = 0;
  let maximumDrawdown = 0;
  for (const trade of closed) {
    let tags: string[] = [];
    let tradeMistakes: string[] = [];
    try {
      tags = JSON.parse(trade.tagsJson ?? "[]") as string[];
      tradeMistakes = JSON.parse(trade.mistakesJson ?? "[]") as string[];
    } catch {
      // Malformed demo annotations must not prevent the preview from loading.
    }
    for (const tag of tags.filter((value) => value.startsWith("setup:"))) {
      const current = setupTotals.get(tag) ?? { count: 0, net: 0 };
      current.count++;
      current.net += trade.netPnl;
      setupTotals.set(tag, current);
    }
    for (const mistake of tradeMistakes) {
      const current = mistakes.get(mistake) ?? { count: 0, net: 0 };
      current.count++;
      current.net += trade.netPnl;
      mistakes.set(mistake, current);
    }
    const day = dayKeyOf(trade.closedAt!, "America/New_York");
    daily.set(day, (daily.get(day) ?? 0) + trade.netPnl);
    equity += trade.netPnl;
    peak = Math.max(peak, equity);
    maximumDrawdown = Math.max(maximumDrawdown, peak - equity);
  }
  const worstDay = Math.min(0, ...daily.values());
  const bestSetups = [...setupTotals.entries()]
    .filter(([, summary]) => summary.count >= 5)
    .sort((a, b) => b[1].net - a[1].net);
  const bestSetup = bestSetups[0];
  const weakestSetup = bestSetups.at(-1);
  const mostFrequentMistake = [...mistakes.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  const maxNq = Math.max(
    0,
    ...tradeRows.filter((trade) => trade.symbol === "NQ").map((trade) => trade.quantity),
  );
  const maxMicros = Math.max(
    0,
    ...tradeRows.filter((trade) => trade.symbol === "MNQ").map((trade) => trade.quantity),
  );

  const setupLine = bestSetup
    ? `SETUP READ: ${bestSetup[0].replace("setup: ", "")} is the strongest sample bucket at ${money(bestSetup[1].net)} over ${bestSetup[1].count} trades. The weakest bucket is ${weakestSetup?.[0].replace("setup: ", "") ?? "not available"} at ${money(weakestSetup?.[1].net ?? 0)}. Treat this as a small synthetic sample, not proof of an edge.`
    : "SETUP READ: There are not enough tagged trades to compare setup buckets.";
  const mistakeLine = mostFrequentMistake
    ? `PROCESS FLAG: “${mostFrequentMistake[0]}” appears ${mostFrequentMistake[1].count} times in the sample. Review those notes for entry timing and exit discipline.`
    : "PROCESS FLAG: No repeated execution issue is tagged in the sample.";

  return [
    "SIMULATED AI REVIEW — Generated locally from the fictional NQ/MNQ journal; no external AI provider was contacted.",
    `SAMPLE: ${closed.length} closed trades, ${money(total)} net after simulated fees, ${(winRate * 100).toFixed(1)}% wins, profit factor ${profitFactor.toFixed(2)}.`,
    setupLine,
    mistakeLine,
    `RISK CHECK: Largest sample realized down day ${money(worstDay)} against the fictional ${money(DEMO_RULES.dailyLossLimit)} daily limit. Peak-to-trough sample drawdown ${money(maximumDrawdown)} against the fictional ${money(DEMO_RULES.trailingDrawdown)} trail. Largest positions ${maxNq}/${DEMO_RULES.maxNq} NQ and ${maxMicros}/${DEMO_RULES.maxMicros} MNQ.`,
    `NEXT REVIEW: Keep the limit at 2 trades per session and stop after 2 consecutive losses or -${money(300)}; review the sample after another month before changing size. A good result does not override a rule breach.`,
  ].join("\n\n");
}

const firmNotes = [
  {
    id: DEMO_NOTE_IDS[2],
    title: "Topstep · public payout reference",
    tags: ["demo", "prop-firm", "futures", "payout-claim"],
    content: [
      "RESEARCH NOTE · Public information checked November 2, 2026. This is not a recommendation or an account linked to the demo.",
      "PUBLISHED PAYOUT CLAIM: Topstep's official site advertises more than $1 billion paid to traders. That is the firm's own headline claim, not an independently ranked comparison.",
      "WHAT TO VERIFY: Current Trading Combine objectives, Maximum Loss Limit, contract scaling, permitted products, payout eligibility and your location.",
      "SOURCE: https://www.topstep.com/topstep-prop",
    ].join("\n\n"),
  },
  {
    id: DEMO_NOTE_IDS[3],
    title: "Apex Trader Funding · public payout reference",
    tags: ["demo", "prop-firm", "futures", "payout-claim"],
    content: [
      "RESEARCH NOTE · Public information checked November 2, 2026. This is not a recommendation or an account linked to the demo.",
      "PUBLISHED PAYOUT CLAIM: Apex's official payout page reported $828M+ total compensation since 2022 and $83M+ in its last 90 days when checked. Those figures are self-reported and can change.",
      "WHAT TO VERIFY: The current evaluation plan, payout eligibility, consistency and safety-net rules, contract scaling, approved products and payout method.",
      "SOURCE: https://secure.apextraderfunding.com/payouts",
    ].join("\n\n"),
  },
  {
    id: DEMO_NOTE_IDS[4],
    title: "Take Profit Trader · public payout reference",
    tags: ["demo", "prop-firm", "futures", "payout-rules"],
    content: [
      "RESEARCH NOTE · Public information checked November 2, 2026. This is not a recommendation or an account linked to the demo.",
      "PUBLISHED PAYOUT TERMS: Its official FAQ describes different PRO and PRO+ stages, including different profit splits and payout terms. The referenced page did not give a directly comparable lifetime payout total.",
      "WHAT TO VERIFY: Current Test rules, drawdown calculation, approved micro contracts, payout buffer, split, request timing and live-account terms.",
      "SOURCE: https://try.takeprofittrader.com/TPT-FAQs-nf40-4-0725",
    ].join("\n\n"),
  },
  {
    id: DEMO_NOTE_IDS[5],
    title: "MyFundedFutures · public payout reference",
    tags: ["demo", "prop-firm", "futures", "payout-rules"],
    content: [
      "RESEARCH NOTE · Public information checked November 2, 2026. This is not a recommendation or an account linked to the demo.",
      "PUBLISHED PAYOUT TERMS: Its help center describes payout conditions that vary by plan and advertises more than 100,000 traders. The referenced article does not provide a directly comparable lifetime payout total.",
      "WHAT TO VERIFY: The exact plan, current consistency and buffer rules, daily-loss conditions, permitted NQ/MNQ size, payout split and transition policy.",
      "SOURCE: https://help.myfundedfutures.com/en/articles/13745661-payout-policy-overview-best-and-fastest-prop-firm-payouts",
    ].join("\n\n"),
  },
  {
    id: DEMO_NOTE_IDS[6],
    title: "Earn2Trade · public payout reference",
    tags: ["demo", "prop-firm", "futures", "payout-rules"],
    content: [
      "RESEARCH NOTE · Public information checked November 2, 2026. This is not a recommendation or an account linked to the demo.",
      "PUBLISHED PROGRAM DATA: Earn2Trade's official page reported 6,400+ traders funded during 2025 and describes weekly withdrawal processing. The cited page does not give a directly comparable lifetime payout total.",
      "WHAT TO VERIFY: Evaluation pass criteria, the proprietary partner after passing, funded-account drawdown and daily-loss rules, contract ladder, withdrawal minimums and fees.",
      "SOURCE: https://www.earn2trade.com/landers/get-funded",
    ].join("\n\n"),
  },
];

function seedFictionalJournalContent(accountId: string) {
  const version = db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, DEMO_SEED_SETTING))
    .get()?.value;
  if (version === DEMO_SEED_VERSION) return;

  const now = nowIso();
  const tradeRows = db
    .select()
    .from(trades)
    .where(eq(trades.accountId, accountId))
    .orderBy(asc(trades.openedAt))
    .all();
  const closed = tradeRows.filter((trade) => trade.status !== "open" && trade.closedAt);
  const byDate = new Map<string, typeof closed>();
  for (const trade of closed) {
    const date = dayKeyOf(trade.closedAt!, getTimeZone());
    const rows = byDate.get(date) ?? [];
    rows.push(trade);
    byDate.set(date, rows);
  }

  createFolder();
  seedPlaybook(now);
  for (const [date, dayTrades] of byDate) {
    const net = dayTrades.reduce((sum, trade) => sum + trade.netPnl, 0);
    const wins = dayTrades.filter((trade) => trade.netPnl > 0).length;
    const losses = dayTrades.length - wins;
    db.insert(journalDays)
      .values({
        date,
        note: [
          "FICTITIOUS NQ/MNQ SESSION — Synthetic example; no real account or market history.",
          "PREP: Wait for the opening range to form. Choose one directional bias, then take only an opening-range pullback, VWAP reclaim/reject, or breakout retest. Define the stop and dollar risk before entry.",
          `SESSION REVIEW: ${dayTrades.length} ${[...new Set(dayTrades.map((trade) => trade.symbol))].join("/")} ${dayTrades.length === 1 ? "trade" : "trades"} with a ${dayTrades[0]?.direction ?? "planned"} bias; ${wins} positive and ${losses} negative after simulated fees; net ${money(net)}.`,
          `RULE CHECK: Maximum ${DEMO_RULES.maxTradesPerDay} trades, one session bias, and a stop after 2 consecutive losses or -$300 realized; fictional hard daily loss limit -${money(DEMO_RULES.dailyLossLimit)}.`,
          ...(net < 0
            ? [
                "LOSS SESSION: The planned attempts ended negative; the sample stops for the day with no revenge trade or direction flip.",
              ]
            : []),
          "NEXT SESSION: Review every trade note and keep size fixed. Do not increase contracts to recover a loss or reach the target faster.",
        ].join("\n\n"),
        updatedAt: `${date}T23:30:00.000Z`,
      })
      .onConflictDoNothing()
      .run();
  }

  const firstDate =
    closed.length > 0
      ? dayKeyOf(closed[0]!.openedAt, getTimeZone())
      : dayKeyOf(new Date().toISOString(), getTimeZone());
  const today = dayKeyOf(now, getTimeZone());
  seedProgress(firstDate, today);
  seedMissedExamples(byDate, now);
  const aiReview = buildAiReview(tradeRows);
  const noteRows = [
    {
      id: DEMO_NOTE_IDS[0],
      title: "Simulated AI review · NQ / MNQ sample",
      content: aiReview,
      tags: ["demo", "ai-review", "NQ", "MNQ", "risk"],
    },
    {
      id: DEMO_NOTE_IDS[1],
      title: "Prop firm comparison · how to read the claims",
      content: [
        `REFERENCE NOTE · Sources checked ${FIRM_RESEARCH_CHECKED}. The five futures providers below are examples to compare, not a verified popularity or payout ranking, sponsorship, or recommendation.`,
        "Payout amounts and trader counts are published by the firms themselves. They use different definitions and dates; do not compare them as if they were audited on one basis. Several firms do not publish a comparable lifetime payout total in the sources listed.",
        "Before paying for an evaluation, confirm the precise plan, NQ/MNQ eligibility and scaling, drawdown method, daily loss rule, prohibited conduct, payout schedule and country eligibility on the firm's current official pages.",
        "This demo's $50,000 balance, $3,000 target, $500 daily limit and $2,000 trailing drawdown are fictional rules and do not copy any firm's current evaluation.",
      ].join("\n\n"),
      tags: ["demo", "prop-firm", "research"],
    },
    ...firmNotes.map((note) => ({ ...note, tags: note.tags })),
  ];

  db.insert(notes)
    .values(
      noteRows.map((note) => ({
        id: note.id,
        folderId: DEMO_FOLDER_ID,
        title: note.title,
        content: note.content,
        tagsJson: JSON.stringify(note.tags),
        tradeKey: null,
        dayDate: null,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing()
    .run();

  const current = db.select().from(accounts).where(eq(accounts.id, accountId)).get();
  if (current) seedPropEvaluation(accountId, firstDate, now);
  db.insert(settings)
    .values({ key: DEMO_SEED_SETTING, value: DEMO_SEED_VERSION })
    .onConflictDoUpdate({ target: settings.key, set: { value: DEMO_SEED_VERSION } })
    .run();
}

async function seedIfNeeded() {
  if (!seedPromise) {
    seedPromise = Promise.resolve().then(() => {
      const version = db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, DEMO_SEED_SETTING))
        .get()?.value;
      if (version !== DEMO_SEED_VERSION) resetPublicDemoContent();

      let demoAccount = db
        .select({ id: accounts.id, archivedAt: accounts.archivedAt })
        .from(accounts)
        .where(eq(accounts.broker, DEMO_BROKER))
        .get();
      if (!demoAccount || demoAccount.archivedAt) {
        const loaded = loadDemoData();
        demoAccount = { id: loaded.accountId, archivedAt: null };
      }
      seedFictionalJournalContent(demoAccount.id);
    });
  }

  try {
    await seedPromise;
  } catch (error) {
    seedPromise = null;
    throw error;
  }
}

/** Seed once, then run the entire async callback against the isolated demo DB. */
export async function runWithSeededDemoDatabase<T>(callback: () => T | Promise<T>): Promise<T> {
  return runWithDemoDatabase(async () => {
    await seedIfNeeded();
    return callback();
  });
}

/**
 * Populate an empty default local database once on startup so first-time users
 * land directly inside a rich, realistic Trading Bauhaus dashboard.
 */
export function ensureDefaultJournalSeeded(): void {
  const existingAccount = db.select({ id: accounts.id }).from(accounts).limit(1).get();
  if (existingAccount) return;
  const loaded = loadDemoData();
  seedFictionalJournalContent(loaded.accountId);
}
