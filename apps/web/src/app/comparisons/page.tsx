"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { Futuristic3DCard } from "@/components/futuristic-3d-card";

interface ComparisonRow {
  feature: string;
  bauhaus: string;
  competitor: string;
}

interface CompetitorData {
  id: string;
  name: string;
  category: string;
  tagline: string;
  rows: ComparisonRow[];
}

const COMPARISON_DATA: CompetitorData[] = [
  {
    id: "tradersync",
    name: "TraderSync",
    category: "Trading Journals",
    tagline:
      "Comparing Trading Bauhaus vs. TraderSync for active futures, forex and stock traders.",
    rows: [
      {
        feature: "Broker Auto-Sync & Import",
        bauhaus: "Direct API + Instant Statement Reconciliation",
        competitor: "950+ brokers (Cloud queue)",
      },
      {
        feature: "AI Trade Feedback",
        bauhaus: "Unlimited AI Critique + Daily Voice Recap",
        competitor: "Cypher AI (5–60 msgs/day)",
      },
      {
        feature: "Trade Replay",
        bauhaus: "Interactive candle replay with buy/sell fills",
        competitor: "1-sec / 250ms (Higher tiers only)",
      },
      {
        feature: "Prop Firm Integration",
        bauhaus: "Built-in Challenge & Payout Cashflow Ledger",
        competitor: "Not prominent / Manual tagging",
      },
      {
        feature: "Cost of Mistakes Tracking",
        bauhaus: "Automated $ lost to FOMO, Revenge & early exits",
        competitor: "Basic tag filter without P&L loss isolation",
      },
      {
        feature: "Lot Accounting Methods",
        bauhaus: "FIFO, LIFO & WAVG with zero-crossing logic",
        competitor: "FIFO only",
      },
      {
        feature: "Multi-Account Aggregation",
        bauhaus: "Simultaneous combined equity & currency groups",
        competitor: "Plan-restricted account limits",
      },
      {
        feature: "Starting Price",
        bauhaus: "Source-Available / Solana Contributor Pass (No monthly SaaS lock-in)",
        competitor: "$29.95 – $79.95/mo ($360–$960/yr)",
      },
      {
        feature: "Data Privacy & Security",
        bauhaus: "100% Private Isolated SQLite on your disk",
        competitor: "Shared multi-tenant cloud database",
      },
      {
        feature: "Best For",
        bauhaus: "Serious Discretionary & Funded Prop Traders",
        competitor: "Mobile-first general retail journaling",
      },
    ],
  },
  {
    id: "tradezella",
    name: "TradeZella",
    category: "Trading Journals",
    tagline:
      "Comparing Trading Bauhaus vs. TradeZella for quantitative review and execution analysis.",
    rows: [
      {
        feature: "Broker Auto-Sync",
        bauhaus: "NinjaTrader, IBKR, MT4/5, Tradovate, cTrader & CSV",
        competitor: "500+ brokers",
      },
      {
        feature: "AI Analyst",
        bauhaus: "Unlimited AI Journal Review (Grounded in metrics)",
        competitor: "All plans (500–1k credits/mo cap)",
      },
      {
        feature: "Trade Replay",
        bauhaus: "Bar-by-bar candle replay + MFE/MAE excursions",
        competitor: "Tick-by-tick (requires higher tier)",
      },
      {
        feature: "Backtesting & Review",
        bauhaus: "Unlimited session reviews & discipline coaching",
        competitor: "Unlimited",
      },
      {
        feature: "Mentor Mode / Sharing",
        bauhaus: "Private read-only demo + multi-user invitations",
        competitor: "5–Unlimited invites (Mentor tier only)",
      },
      {
        feature: "Prop Firm Integration",
        bauhaus: "Built-in (Challenge fees, resets, payout tracker)",
        competitor: "Built-in",
      },
      {
        feature: "Institutional Risk Metrics",
        bauhaus: "Sharpe, Sortino, SQN & R-Expectancy distribution",
        competitor: "Standard Win Rate & Profit Factor",
      },
      {
        feature: "Starting Price",
        bauhaus: "Source-Available / Solana Contributor Pass (No monthly SaaS lock-in)",
        competitor: "$29/mo – $49/mo ($348–$588/yr)",
      },
      {
        feature: "Data Ownership",
        bauhaus: "Full uncorrupted JSON & CSV database export",
        competitor: "Proprietary cloud platform lock-in",
      },
      {
        feature: "Best For",
        bauhaus: "Independent Traders who refuse SaaS lock-in",
        competitor: "AI-first full retail platform",
      },
    ],
  },
  {
    id: "edgewonk",
    name: "Edgewonk",
    category: "Trading Journals",
    tagline:
      "Comparing Trading Bauhaus vs. Edgewonk for modern day trading and psychological tracking.",
    rows: [
      {
        feature: "Software Architecture",
        bauhaus: "Modern Web App with sub-second response times",
        competitor: "Legacy desktop client (Java runtime)",
      },
      {
        feature: "Broker Statement Import",
        bauhaus: "1-Click automated statement decoder",
        competitor: "Manual and slow file importing",
      },
      {
        feature: "Mobile & Tablet Access",
        bauhaus: "Responsive Touch UI with quick trade cards",
        competitor: "No native mobile support",
      },
      {
        feature: "Psychology & Discipline",
        bauhaus: "Mistake cost calculator + Voice notes dictation",
        competitor: "Manual emotional dropdowns",
      },
      {
        feature: "Prop Firm Ledger",
        bauhaus: "Dedicated Challenge/Payout Ledger with ROI",
        competitor: "Not supported (retail focus only)",
      },
      {
        feature: "Starting Price",
        bauhaus: "Source-Available / Solana Contributor Pass (No monthly SaaS lock-in)",
        competitor: "$169/year recurring",
      },
      {
        feature: "Best For",
        bauhaus: "Modern Prop Firm & Intraday Scalpers",
        competitor: "Legacy desktop swing traders",
      },
    ],
  },
  {
    id: "notion",
    name: "Notion",
    category: "Alternatives",
    tagline: "Comparing Trading Bauhaus vs. Notion databases for trade accounting and review.",
    rows: [
      {
        feature: "Position Accounting",
        bauhaus: "Automated FIFO / LIFO / WAVG lot matching",
        competitor: "Requires brittle manual formulas that break on partial exits",
      },
      {
        feature: "Trade Replay",
        bauhaus: "Interactive candle charts with execution markers",
        competitor: "Static manual screenshot paste only",
      },
      {
        feature: "Intraday Equity Curve",
        bauhaus: "Real-time cumulative P&L progression per fill",
        competitor: "Not supported in Notion databases",
      },
      {
        feature: "Multi-Broker Import",
        bauhaus: "Direct parsing of statements (NinjaTrader, IBKR, CSV)",
        competitor: "Manual typing or copy-pasting table rows",
      },
      {
        feature: "R-Multiple Calculation",
        bauhaus: "Automatic planned vs realized R-multiple tracking",
        competitor: "Manual custom calculation per trade",
      },
      {
        feature: "Starting Price",
        bauhaus: "Source-Available / Solana Contributor Pass (No monthly SaaS lock-in)",
        competitor: "$10 – $20/user/mo",
      },
      {
        feature: "Best For",
        bauhaus: "Accurate quantitative trade accounting",
        competitor: "General notes and task management",
      },
    ],
  },
  {
    id: "excel",
    name: "Excel / Spreadsheets",
    category: "Alternatives",
    tagline: "Comparing Trading Bauhaus vs. Excel spreadsheets for trading journals.",
    rows: [
      {
        feature: "Execution Deduping",
        bauhaus: "SHA-256 content hashes prevent duplicate fills",
        competitor: "High risk of duplicate fills on statement re-import",
      },
      {
        feature: "Timezone Handling",
        bauhaus: "Automatic UTC/EST/London session conversion",
        competitor: "Frequent daylight saving & session math errors",
      },
      {
        feature: "Playbook Compliance",
        bauhaus: "Automated checklist scoring & adherence percentage",
        competitor: "Requires complex macros or manual coloring",
      },
      {
        feature: "Mobile Usability",
        bauhaus: "Clean mobile drawer & adaptive trade cards",
        competitor: "Painful pinch-to-zoom and microscopic cells",
      },
      {
        feature: "Time Spent Journaling",
        bauhaus: "Under 2 minutes per session",
        competitor: "20–30 minutes of manual data entry",
      },
      {
        feature: "Best For",
        bauhaus: "Automated trading analytics without human error",
        competitor: "Basic table bookkeeping",
      },
    ],
  },
  {
    id: "tradingview",
    name: "TradingView",
    category: "Backtesting & Charting",
    tagline: "Comparing Trading Bauhaus vs. TradingView paper trading and chart logs.",
    rows: [
      {
        feature: "Primary Focus",
        bauhaus: "Deep post-trade review & trader psychology",
        competitor: "Live market charting & technical indicators",
      },
      {
        feature: "Prop Firm Tracking",
        bauhaus: "Dedicated challenge fees, resets & payout ledger",
        competitor: "None (charting only)",
      },
      {
        feature: "Psychological Journaling",
        bauhaus: "Mistake tags, daily context, and discipline score",
        competitor: "None",
      },
      {
        feature: "Multi-Account Aggregation",
        bauhaus: "Combines multiple accounts into one calendar",
        competitor: "Single broker connection at a time",
      },
      {
        feature: "Starting Price",
        bauhaus: "Source-Available / Solana Contributor Pass (No monthly SaaS lock-in)",
        competitor: "$14.95 – $59.95/mo ($180–$720/yr)",
      },
      {
        feature: "Best For",
        bauhaus: "Post-trade journaling, psychology & funded accounts",
        competitor: "Live market technical analysis",
      },
    ],
  },
  {
    id: "fxreplay",
    name: "FX Replay",
    category: "Backtesting & Charting",
    tagline: "Comparing Trading Bauhaus vs. FX Replay for execution practice and review.",
    rows: [
      {
        feature: "Real Money & Funded Accounts",
        bauhaus: "Reconciles live fills from actual broker accounts",
        competitor: "Simulation sandbox only",
      },
      {
        feature: "Journal & Session Notes",
        bauhaus: "Rich daily reflections, voice dictation & attachments",
        competitor: "Minimal charting replay log",
      },
      {
        feature: "Asset Class Support",
        bauhaus: "Futures, Forex, Crypto, Stocks & Options",
        competitor: "Primarily Forex and select index CFDs",
      },
      {
        feature: "Prop Firm Payout Ledger",
        bauhaus: "Tracks actual challenge costs and payout receipts",
        competitor: "None",
      },
      {
        feature: "Starting Price",
        bauhaus: "Source-Available / Solana Contributor Pass (No monthly SaaS lock-in)",
        competitor: "$35/mo subscription",
      },
      {
        feature: "Best For",
        bauhaus: "Live performance auditing & prop firm traders",
        competitor: "Weekend market simulation practice",
      },
    ],
  },
  {
    id: "tradeify",
    name: "Tradeify",
    category: "Prop Firm Rule Trackers",
    tagline:
      "Comparing Trading Bauhaus vs. Tradeify native dashboard for EOD trailing drawdown and Select Daily payouts.",
    rows: [
      {
        feature: "EOD Trailing Drawdown Engine",
        bauhaus: "Simulated real-time EOD buffer without false intra-trade breaches",
        competitor: "Website dashboard only updates after CME daily cutoff",
      },
      {
        feature: "Multi-Account Aggregation",
        bauhaus: "Track multiple 50k / 150k evaluation and funded accounts in unified ledger",
        competitor: "Single account view in separate browser tabs",
      },
      {
        feature: "Select Daily Payout Preparation",
        bauhaus: "Automated daily safety buffer tracking to ensure payout qualification",
        competitor: "Manual calculation of high-water mark",
      },
      {
        feature: "Cost of Mistakes Tracking",
        bauhaus: "Calculates exact $ lost to FOMO and early exits against your target",
        competitor: "Hard breach alert after rule is violated",
      },
      {
        feature: "Data Privacy & Storage",
        bauhaus: "Physical SQLite on local disk (Zero cloud data harvesting)",
        competitor: "Centralized server logs",
      },
      {
        feature: "Pricing",
        bauhaus: "Source-Available / Solana Contributor Pass (No monthly SaaS lock-in)",
        competitor: "Evaluation / account activation costs",
      },
    ],
  },
  {
    id: "takeprofittrader",
    name: "Take Profit Trader",
    category: "Prop Firm Rule Trackers",
    tagline:
      "Comparing Trading Bauhaus vs. Take Profit Trader ProDay tracking for Day-1 withdrawals and risk discipline.",
    rows: [
      {
        feature: "Day-1 Withdrawal Calculator",
        bauhaus: "Instant withdrawal headroom calculator factoring buffer requirements",
        competitor: "Standard web portal rules table",
      },
      {
        feature: "Intraday Risk Guard",
        bauhaus: "Flags trades within 20% of daily loss boundary with audio/visual warnings",
        competitor: "Account liquidation once daily loss limit is hit",
      },
      {
        feature: "Commission & Exchange Fee Tracking",
        bauhaus: "Tick-exact deduction for NQ/ES CME fees across all executions",
        competitor: "End-of-day broker statement reconciliation",
      },
      {
        feature: "AI Playbook Review",
        bauhaus: "Evaluates whether winning days adhered to strategy entry criteria",
        competitor: "None",
      },
      {
        feature: "Data Sovereignty",
        bauhaus: "100% Private Isolated SQLite on your local device",
        competitor: "Hosted web platform",
      },
      {
        feature: "Pricing",
        bauhaus: "Source-Available / Solana Contributor Pass (No monthly SaaS lock-in)",
        competitor: "Challenge fee + monthly data/platform fees",
      },
    ],
  },
  {
    id: "lucidtrading",
    name: "Lucid Trading",
    category: "Prop Firm Rule Trackers",
    tagline:
      "Comparing Trading Bauhaus vs. Lucid Trading for 40% consistency rule compliance and zero-activation-fee accounting.",
    rows: [
      {
        feature: "40% Consistency Rule Monitor",
        bauhaus: "Live concentration radar: alerts if a single day exceeds 40% of cycle profits",
        competitor: "Evaluated retroactively at payout request",
      },
      {
        feature: "Scalping Duration Guard",
        bauhaus: "Flags trades under minimum holding time thresholds before exit",
        competitor: "Manual compliance audit",
      },
      {
        feature: "Zero-Activation-Fee Ledger",
        bauhaus: "Models true net profit margins factoring zero upfront funded fees",
        competitor: "Standard payout summary",
      },
      {
        feature: "Multi-Broker Execution Sync",
        bauhaus: "Tradovate, NinjaTrader 8, Rithmic, IBKR & MT5 in one unified hub",
        competitor: "Native broker connection only",
      },
      {
        feature: "Sovereign Storage",
        bauhaus: "Physical SQLite tenancy with AES-256 encrypted rest state",
        competitor: "Shared cloud web portal",
      },
      {
        feature: "Pricing",
        bauhaus: "Source-Available / Solana Contributor Pass (No monthly SaaS lock-in)",
        competitor: "Challenge evaluation fees",
      },
    ],
  },
];

export default function ComparisonsPage() {
  const [selectedId, setSelectedId] = useState<string>("tradersync");

  const current = COMPARISON_DATA.find((c) => c.id === selectedId) ?? COMPARISON_DATA[0]!;

  return (
    <div className="min-h-screen bg-[#080b0a] text-slate-200 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-10">
        {/* Navigation & Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
            <span className="text-slate-600">/</span>
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 text-brand hover:text-brand/80 transition"
            >
              Live Demo
            </Link>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-mono text-brand">
            <Zap className="h-3.5 w-3.5" /> COMPETITIVE FEATURE MATRIX
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Compare Trading Journals &amp; Alternatives
          </h1>
          <p className="text-base text-slate-400 max-w-2xl">
            See how Trading Bauhaus gives you institutional execution analytics, prop firm tracking,
            and AI feedback without monthly subscription lock-in.
          </p>
        </div>

        {/* Competitor Selector Pills (Direct, clean switcher) */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#0e1312] p-2 border border-white/10">
          {COMPARISON_DATA.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                selectedId === c.id
                  ? "bg-brand text-[#04150b] font-bold shadow-[0_0_15px_rgba(53,208,116,0.35)]"
                  : "bg-transparent text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              vs. {c.name}
            </button>
          ))}
        </div>

        {/* 3D Main Comparison Table Container */}
        <Futuristic3DCard
          glowColor="rgba(53, 208, 116, 0.2)"
          depth={15}
          className="p-0 overflow-hidden"
        >
          <div className="p-6 md:p-8 border-b border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
              {current.category}
            </span>
            <h2 className="text-2xl font-bold text-white mt-1">
              Trading Bauhaus <span className="text-brand">vs.</span> {current.name}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{current.tagline}</p>
          </div>

          {/* Exact Comparison Table Matching TraderZella / TraderSync Layout */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#0f1422] text-xs font-bold uppercase tracking-wider text-white border-b border-white/10">
                  <th className="py-4 px-6 w-1/3">FEATURE</th>
                  <th className="py-4 px-6 w-1/3 text-brand">TRADING BAUHAUS</th>
                  <th className="py-4 px-6 w-1/3 text-slate-300">{current.name.toUpperCase()}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {current.rows.map((row, index) => (
                  <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 font-semibold text-white">{row.feature}</td>
                    <td className="py-4 px-6 font-semibold text-[#35d074]">{row.bauhaus}</td>
                    <td className="py-4 px-6 text-slate-400">{row.competitor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Futuristic3DCard>

        {/* Bottom Callout */}
        <div className="rounded-xl border border-white/10 bg-[#0e1312] p-6 text-center space-y-3">
          <h3 className="text-lg font-bold text-white">Ready to upgrade your trading journal?</h3>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Stop paying $350–$600 per year for closed SaaS platforms. Experience sovereign,
            high-speed execution journaling built for real traders.
          </p>
          <div className="pt-2">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-[#04150b] transition hover:bg-brand/90 hover:shadow-[0_0_20px_rgba(53,208,116,0.35)]"
            >
              Explore the Live Interactive Demo →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
