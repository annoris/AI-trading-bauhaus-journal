"use client";

import Link from "next/link";
import { SocialButtonsRow } from "@/components/social-links";
import {
  Cpu,
  Layers,
  Sparkles,
  Lock,
  Globe2,
  FileText,
  Heart,
  Briefcase,
  Mail,
} from "lucide-react";

export function FuturisticFooter() {
  return (
    <footer className="relative mt-16 border-t border-white/10 bg-[#060807] pt-12 pb-16 text-slate-300 overflow-hidden">
      {/* Subtle Ambient Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-brand/10 blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-10 h-64 w-64 rounded-full bg-cyan-500/5 blur-[120px]"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Brand Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 mb-10 border-b border-white/5">
          <div>
            <Link href="/" className="inline-flex items-center gap-1.5 text-lg font-bold tracking-tight text-white hover:opacity-90 transition">
              <span>TRADING</span>
              <span className="text-brand">BAUHAUS•</span>
            </Link>
            <p className="text-xs text-slate-400 mt-1">
              Sovereign trade journal, performance analytics &amp; AI-assisted execution reviews.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <SocialButtonsRow size="sm" />
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 pl-0 sm:pl-3 sm:border-l sm:border-white/10">
              <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
              <span>Operational Engine</span>
            </div>
          </div>
        </div>

        {/* 4-Column Navigation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Column 1: Compare Trading Journals */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white">
              <Layers className="h-4 w-4 text-brand" />
              <span>Compare Trading Journals</span>
            </div>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/comparisons#tradersync"
                  className="group flex items-center justify-between text-slate-400 transition hover:text-white"
                >
                  <span>vs. TraderSync</span>
                  <span className="text-[10px] font-mono rounded bg-white/5 px-1.5 py-0.5 text-brand group-hover:bg-brand/10 transition">
                    Speed + Privacy
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/comparisons#tradezella"
                  className="group flex items-center justify-between text-slate-400 transition hover:text-white"
                >
                  <span>vs. TradeZella</span>
                  <span className="text-[10px] font-mono rounded bg-white/5 px-1.5 py-0.5 text-brand group-hover:bg-brand/10 transition">
                    No Monthly Fee
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/comparisons#edgewonk"
                  className="group flex items-center justify-between text-slate-400 transition hover:text-white"
                >
                  <span>vs. Edgewonk</span>
                  <span className="text-[10px] font-mono rounded bg-white/5 px-1.5 py-0.5 text-brand group-hover:bg-brand/10 transition">
                    Real-time AI
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/comparisons"
                  className="text-xs text-brand/80 hover:text-brand inline-flex items-center gap-1 pt-1"
                >
                  View full matrix →
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Compare Alternatives */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white">
              <Cpu className="h-4 w-4 text-cyan-400" />
              <span>Compare Alternatives</span>
            </div>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/comparisons#notion"
                  className="group flex items-center justify-between text-slate-400 transition hover:text-white"
                >
                  <span>vs. Notion</span>
                  <span className="text-[10px] font-mono rounded bg-white/5 px-1.5 py-0.5 text-cyan-400 group-hover:bg-cyan-400/10 transition">
                    Auto FIFO/P&amp;L
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/comparisons#excel"
                  className="group flex items-center justify-between text-slate-400 transition hover:text-white"
                >
                  <span>vs. Excel</span>
                  <span className="text-[10px] font-mono rounded bg-white/5 px-1.5 py-0.5 text-cyan-400 group-hover:bg-cyan-400/10 transition">
                    Broker Sync
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/comparisons"
                  className="text-xs text-cyan-400/80 hover:text-cyan-400 inline-flex items-center gap-1 pt-1"
                >
                  Why custom beats spreadsheets →
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Compare Prop Firms & Backtesting */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white">
              <Globe2 className="h-4 w-4 text-indigo-400" />
              <span>Prop Firms &amp; Backtesting</span>
            </div>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/comparisons#tradeify"
                  className="group flex items-center justify-between text-slate-400 transition hover:text-white"
                >
                  <span>vs. Tradeify</span>
                  <span className="text-[10px] font-mono rounded bg-white/5 px-1.5 py-0.5 text-indigo-400 group-hover:bg-indigo-400/10 transition">
                    EOD Drawdown
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/comparisons#takeprofittrader"
                  className="group flex items-center justify-between text-slate-400 transition hover:text-white"
                >
                  <span>vs. Take Profit Trader</span>
                  <span className="text-[10px] font-mono rounded bg-white/5 px-1.5 py-0.5 text-indigo-400 group-hover:bg-indigo-400/10 transition">
                    Day-1 Payout
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/comparisons#lucidtrading"
                  className="group flex items-center justify-between text-slate-400 transition hover:text-white"
                >
                  <span>vs. Lucid Trading</span>
                  <span className="text-[10px] font-mono rounded bg-white/5 px-1.5 py-0.5 text-indigo-400 group-hover:bg-indigo-400/10 transition">
                    40% Rule
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/comparisons#tradingview"
                  className="group flex items-center justify-between text-slate-400 transition hover:text-white"
                >
                  <span>vs. TradingView</span>
                  <span className="text-[10px] font-mono rounded bg-white/5 px-1.5 py-0.5 text-slate-400 group-hover:bg-white/10 transition">
                    Journaling
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/comparisons"
                  className="text-xs text-indigo-400/80 hover:text-indigo-400 inline-flex items-center gap-1 pt-1"
                >
                  View full prop firm matrix →
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Platform & Legal */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>Platform &amp; Legal</span>
            </div>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/contact"
                  className="flex items-center gap-2 text-slate-400 transition hover:text-white"
                >
                  <Mail className="h-3.5 w-3.5 text-slate-500" /> Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact?subject=careers"
                  className="flex items-center gap-2 text-slate-400 transition hover:text-white"
                >
                  <Briefcase className="h-3.5 w-3.5 text-slate-500" /> Careers
                  <span className="text-[10px] bg-white/10 rounded px-1 text-slate-300">Hiring</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/wall-of-love"
                  className="flex items-center gap-2 text-slate-400 transition hover:text-white"
                >
                  <Heart className="h-3.5 w-3.5 text-purple-400 fill-purple-400/20" /> Wall of love 💜
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="flex items-center gap-2 font-medium text-slate-300 transition hover:text-brand"
                >
                  <Lock className="h-3.5 w-3.5 text-brand" /> Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="flex items-center gap-2 font-medium text-slate-300 transition hover:text-cyan-400"
                >
                  <FileText className="h-3.5 w-3.5 text-cyan-400" /> Terms &amp; Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <span className="font-medium text-slate-400">© {new Date().getFullYear()} Trading Bauhaus. All rights reserved.</span>
            <span className="hidden sm:inline text-slate-700">·</span>
            <span className="text-[11px] text-slate-500">Read-only demo uses simulated data · Personal journals require owner invitation.</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">Sovereign execution journal &amp; performance analytics</span>
        </div>
      </div>
    </footer>
  );
}
