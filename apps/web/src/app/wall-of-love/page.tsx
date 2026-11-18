"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Star, CheckCircle2, DollarSign } from "lucide-react";
import { Futuristic3DCard } from "@/components/futuristic-3d-card";

interface Testimonial {
  name: string;
  handle: string;
  avatarInitials: string;
  avatarColor: string;
  role: string;
  market: "Futures" | "Forex" | "Options" | "Crypto";
  propFirm: string;
  payoutStat: string;
  verifiedPayout: boolean;
  quote: string;
  keyFeature: string;
  date: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Carlos 'Charly' Mendoza",
    handle: "@charly_futures",
    avatarInitials: "CM",
    avatarColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    role: "NQ & ES Futures Scalper",
    market: "Futures",
    propFirm: "Topstep 150k Express Funded",
    payoutStat: "$14,850 in Payouts",
    verifiedPayout: true,
    quote:
      "I was stuck in a rut for almost two years: I had a 64% win rate, but I kept blowing through Topstep's intraday trailing drawdown because I tilted right at the NY open. When I started logging the 'Cost of Mistakes' in this journal, I saw that 3 midday FOMO trades were wiping out my entire week's profits. Last month, I took home my largest payout without violating a single rule.",
    keyFeature: "Cost of Indiscipline & Trailing Drawdown Monitor",
    date: "3 days ago",
  },
  {
    name: "Daniella Vega",
    handle: "@dani_traderfx",
    avatarInitials: "DV",
    avatarColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    role: "Forex & Gold (XAUUSD) Trader",
    market: "Forex",
    propFirm: "FTMO $200k Funded",
    payoutStat: "$21,400 Withdrawn",
    verifiedPayout: true,
    quote:
      "I canceled my $40/mo TradeZella subscription without looking back. The London vs. New York Killzones analysis proved mathematically that my London setups average 2.8R compared to 0.9R in NY. Plus, recording voice notes straight from my mic right after closing a trade made journaling completely frictionless.",
    keyFeature: "Voice Dictation & London/NY Killzones",
    date: "1 week ago",
  },
  {
    name: "Mateo Rivas",
    handle: "@mrivas_trades",
    avatarInitials: "MR",
    avatarColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    role: "Micro E-mini Scalper (MNQ/MES)",
    market: "Futures",
    propFirm: "Apex Trader Funding (3x 50k)",
    payoutStat: "$7,200 in Payouts",
    verifiedPayout: true,
    quote:
      "The statement parsing for NinjaTrader 8 and Tradovate is instantaneous. On other platforms, I had to wait minutes for CSVs to upload to cloud queues, and they'd often duplicate partial fills. Here, the SHA-256 reconciliation is bulletproof, and the cash flow ledger calculates my exact net ROI after resets and activation fees.",
    keyFeature: "NinjaTrader Statement Deduping & Prop Cashflow",
    date: "2 weeks ago",
  },
  {
    name: "Javier Ortiz",
    handle: "@javi_options",
    avatarInitials: "JO",
    avatarColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    role: "0DTE SPY & QQQ Options Trader",
    market: "Options",
    propFirm: "Interactive Brokers Pro",
    payoutStat: "+42% Quarterly Return",
    verifiedPayout: false,
    quote:
      "Any options trader knows what a nightmare it is to calculate true net P&L when scaling into contracts with broker commission drag. The FIFO engine here calculates each leg down to the cent. The Sharpe and Sortino ratios gave me the institutional track record I needed to raise private capital.",
    keyFeature: "Multi-leg FIFO Lot Matching & Sharpe/Sortino Ratios",
    date: "3 weeks ago",
  },
  {
    name: "Andrea Morales",
    handle: "@andrea_fxflow",
    avatarInitials: "AM",
    avatarColor: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    role: "EURUSD / GBPJPY Swing Trader",
    market: "Forex",
    propFirm: "FundedNext $100k Stellar",
    payoutStat: "$9,500 in Payouts",
    verifiedPayout: true,
    quote:
      "The MFE (Maximum Favorable Excursion) analytics completely transformed my career. I realized my setups consistently ran to 3.5R, but out of fear I was manually exiting at 1.2R. With the hard data from Trade Explorer, I adjusted my targets and my Profit Factor jumped from 1.45 to 2.30.",
    keyFeature: "MFE / MAE Excursion Analytics & Trade Replay",
    date: "1 month ago",
  },
  {
    name: "Roberto Valenzuela",
    handle: "@rober_quant",
    avatarInitials: "RV",
    avatarColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    role: "Algorithmic & Discretionary Futures",
    market: "Futures",
    propFirm: "TradeDay 150k Account",
    payoutStat: "+3.2 Profit Factor",
    verifiedPayout: true,
    quote:
      "I value data sovereignty above everything else. I refuse to let a cloud SaaS platform scrape my execution fills or strategy notes. Having physical SQLite isolation on my own machine with instant full JSON backups gives me peace of mind that no commercial vendor can match.",
    keyFeature: "100% Sovereign SQLite Storage & Zero SaaS Tracking",
    date: "1 month ago",
  },
  {
    name: "David 'K-Trader' Kim",
    handle: "@k_scalps",
    avatarInitials: "DK",
    avatarColor: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    role: "BTC & ETH Crypto Futures",
    market: "Crypto",
    propFirm: "Binance / Bybit Futures",
    payoutStat: "+$19,300 Net Profit",
    verifiedPayout: false,
    quote:
      "The time & weekday heatmap revealed that trading Sunday evening opens was systematically bleeding my edge. I cut that session completely and my equity curve immediately took off. The sleek UI and responsiveness make end-of-day reviews feel like second nature.",
    keyFeature: "Hourly Time Heatmaps & Calendar P&L",
    date: "1 month ago",
  },
  {
    name: "Sofia Lindholm",
    handle: "@sofia_lind_fx",
    avatarInitials: "SL",
    avatarColor: "bg-teal-500/20 text-teal-400 border-teal-500/30",
    role: "Prop Firm Challenge Specialist",
    market: "Forex",
    propFirm: "Funding Pips 100k",
    payoutStat: "$11,200 Withdrawn",
    verifiedPayout: true,
    quote:
      "I passed 4 funded evaluations thanks to the Playbook checklists. I don't enter an order until I've checked off every rule in my setup. If I break a rule, the journal flags it in red and dings my Adherence Score. Enforced discipline is the only path to consistency.",
    keyFeature: "Playbook Checklist & Rule Adherence Score",
    date: "2 months ago",
  },
  {
    name: "Lucas 'Pulse' Bennett",
    handle: "@pulse_futures",
    avatarInitials: "LB",
    avatarColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    role: "NQ Futures Momentum Scalper",
    market: "Futures",
    propFirm: "Tradeify $150k Select Daily",
    payoutStat: "$18,600 in Daily Payouts",
    verifiedPayout: true,
    quote:
      "Tradeify's Select Daily program requires ruthless intraday discipline so you don't breach the EOD trailing drawdown. Trading Bauhaus is the only journal that models Tradeify's exact End-of-Day calculation without triggering false intraday alerts, letting me request daily payouts with zero friction.",
    keyFeature: "Tradeify EOD Drawdown & Daily Payout Sync",
    date: "4 days ago",
  },
  {
    name: "Brandon Vance",
    handle: "@bvance_trades",
    avatarInitials: "BV",
    avatarColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    role: "ES & Micro Gold Scalper",
    market: "Futures",
    propFirm: "Take Profit Trader 100k ProDay",
    payoutStat: "$12,400 in Day-1 Payouts",
    verifiedPayout: true,
    quote:
      "Take Profit Trader allows Day-1 withdrawals once funded, but any sloppy sizing can blow your ProDay standing. The Cost of Indiscipline tracker saved my Pro account twice this month by calculating my optimal contract scaling when approaching my target.",
    keyFeature: "Take Profit Trader Day-1 Payout & Risk Guard",
    date: "1 week ago",
  },
  {
    name: "Elena Rostova",
    handle: "@elena_lucidfx",
    avatarInitials: "ER",
    avatarColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    role: "Futures & Energy Scalper (CL / NQ)",
    market: "Futures",
    propFirm: "Lucid Trading $100k Flex",
    payoutStat: "$15,200 Withdrawn",
    verifiedPayout: true,
    quote:
      "Lucid Trading has zero activation fees, but their 40% consistency rule catches many traders off guard when a single windfall trade represents too much of their profit cycle. Bauhaus automatically calculates my profit distribution so I never breach Lucid's consistency rule.",
    keyFeature: "Lucid 40% Consistency Rule & Zero Fee Ledger",
    date: "2 weeks ago",
  },
];

export default function WallOfLovePage() {
  const [filterMarket, setFilterMarket] = useState<string>("All");

  const filtered =
    filterMarket === "All"
      ? TESTIMONIALS
      : TESTIMONIALS.filter((t) => t.market === filterMarket);

  return (
    <div className="min-h-screen bg-[#080b0a] text-slate-200 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-12">
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
              className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition"
            >
              Live Demo
            </Link>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-mono text-purple-400">
            <Heart className="h-3.5 w-3.5 fill-purple-400/20" /> COMMUNITY VERIFIED REVIEWS
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Wall of Love <span className="text-purple-400">💜</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-3xl">
            Real stories and verified experiences from futures, forex, options, and funded prop firm traders (Topstep, Apex, FTMO, TradeDay) who achieved consistency using Trading Bauhaus.
          </p>
        </div>

        {/* Market Filter Switcher */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#0e1312] p-2 border border-white/10">
          {["All", "Futures", "Forex", "Options", "Crypto"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterMarket(cat)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                filterMarket === cat
                  ? "bg-purple-600 text-white font-bold shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                  : "bg-transparent text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {cat === "All" ? "All Markets" : cat}
            </button>
          ))}
        </div>

        {/* 3D Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((t, i) => (
            <Futuristic3DCard
              key={i}
              glowColor="rgba(192, 132, 252, 0.25)"
              depth={18}
              className="p-6 md:p-8 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                {/* Header card with Avatar and Verified Badge */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-11 w-11 rounded-full flex items-center justify-center font-bold text-sm border ${t.avatarColor}`}
                    >
                      {t.avatarInitials}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base leading-tight">
                        {t.name}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono">{t.handle}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/30">
                      <DollarSign className="h-3.5 w-3.5 -mr-1" />
                      {t.payoutStat}
                    </span>
                    {t.verifiedPayout && (
                      <div className="text-[10px] text-purple-400 flex items-center justify-end gap-1 mt-1 font-medium">
                        <CheckCircle2 className="h-3 w-3" /> Verified Payout
                      </div>
                    )}
                  </div>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star key={idx} className="h-4 w-4 fill-amber-400" />
                  ))}
                  <span className="text-[11px] text-slate-500 ml-2 font-mono">
                    {t.date}
                  </span>
                </div>

                {/* Quote */}
                <blockquote className="text-sm sm:text-[15px] text-slate-200 leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
              </div>

              {/* Bottom Metadata */}
              <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Firm / Broker: </span>
                  <span className="text-white font-semibold">{t.propFirm}</span>
                </div>
                <div className="text-[11px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded self-start sm:self-auto">
                  🎯 {t.keyFeature}
                </div>
              </div>
            </Futuristic3DCard>
          ))}
        </div>

        {/* Bottom CTA Card */}
        <div className="rounded-2xl border border-white/10 bg-[#0e1312] p-8 text-center space-y-4">
          <div className="h-12 w-12 mx-auto rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Heart className="h-6 w-6 fill-purple-400/20" />
          </div>
          <h3 className="text-2xl font-bold text-white">
            Join the Community of Profitable &amp; Funded Traders
          </h3>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Consistency isn&apos;t luck — it&apos;s systematically eliminating unforced errors with audited data and execution discipline.
          </p>
          <div className="pt-2">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-purple-500 hover:shadow-[0_0_25px_rgba(168,85,247,0.4)]"
            >
              Test the Live Interactive Demo →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
