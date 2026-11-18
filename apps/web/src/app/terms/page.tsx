"use client";

import {
  AlertTriangle,
  Scale,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { Futuristic3DCard } from "@/components/futuristic-3d-card";

export default function TermsConditionsPage() {
  return (
    <div className="min-h-screen bg-[#080b0a] text-slate-200 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* Navigation & Header */}
        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-mono text-cyan-400">
            <Scale className="h-3.5 w-3.5" /> LEGAL AGREEMENT · FLORIDA JURISDICTION &amp; CFTC
            DISCLOSURES
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Terms &amp; Conditions of Service
          </h1>
          <p className="text-base text-slate-400 max-w-3xl leading-relaxed">
            Effective Date: November 2026. These Terms &amp; Conditions govern your access to and
            use of the Trading Bauhaus analytical software suite. By accessing or using the
            platform, you acknowledge and agree to be bound by these terms under the governing laws
            of the State of Florida.
          </p>
        </div>

        {/* 3D CFTC Risk Highlight Card */}
        <Futuristic3DCard
          glowColor="rgba(248, 113, 113, 0.25)"
          depth={20}
          className="p-6 md:p-8 border-loss/30"
        >
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-loss/10 border border-loss/30 flex items-center justify-center text-loss">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                CFTC Rule 4.41 · Hypothetical &amp; Simulated Performance Disclaimer
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hypothetical or simulated performance results have certain inherent limitations.
                Unlike an actual performance record, simulated results do not represent actual
                trading. Also, since the trades have not actually been executed, the results may
                have under- or over-compensated for the impact, if any, of certain market factors,
                such as lack of liquidity. Simulated trading programs in general are also subject to
                the fact that they are designed with the benefit of hindsight. No representation is
                being made that any account will or is likely to achieve profits or losses similar
                to those shown.
              </p>
            </div>
          </div>
        </Futuristic3DCard>

        {/* Core Terms */}
        <div className="space-y-8 rounded-2xl border border-white/10 bg-[#0e1312] p-8 md:p-10 shadow-2xl">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-cyan-400" /> 1. Nature of the Software &amp;
              Florida Ch. 517 Safe Harbor
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Trading Bauhaus is an analytical post-trade journaling, behavioral tracking, and
              performance evaluation software application. Trading Bauhaus is{" "}
              <strong className="text-white">NOT</strong> an investment adviser under the Florida
              Securities and Investor Protection Act (Fla. Stat. § 517.021), not a registered
              broker-dealer, not a commodity trading advisor (CTA), and not a financial planner.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              Nothing produced by the application, including performance metrics, Kelly Criterion
              sizing approximations, R-multiple distributions, or AI Journal Analyst completions,
              constitutes investment advice, financial guidance, or a recommendation or solicitation
              to purchase or sell any security, futures contract, foreign exchange pair, option, or
              digital asset.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3 pt-4 border-t border-white/5">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-cyan-400" /> 2. Prop Firm Evaluations &amp;
              Capital Risk
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              The proprietary firm ledger, evaluation tracker, and payout log are designed solely
              for self-directed personal financial bookkeeping of challenge fees, resets, and
              simulated profit allocations. Trading Bauhaus does not guarantee that any trader will
              pass evaluations or maintain funded account status with any third-party prop firm.
              Trading involves substantial risk of financial loss and is not suitable for every
              investor.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 pt-4 border-t border-white/5">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-cyan-400" /> 3. Trader Responsibility &amp;
              Execution Reconciliation
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              While our parsing algorithms reconcile fill sequences and calculate statistics using
              deterministic FIFO, LIFO, and weighted average methods, the trader is solely
              responsible for verifying the completeness and accuracy of all imported trade
              statements against official clearing broker confirmations or exchange statements.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3 pt-4 border-t border-white/5">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-cyan-400" /> 4. Intellectual Property &amp;
              Sovereign Data Ownership
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              You retain 100% intellectual property ownership of your trading records, private
              playbooks, customized mistake tags, reflections, and uploaded chart media. Trading
              Bauhaus grants you a revocable, non-exclusive, non-transferable license to access and
              utilize the application solely for your internal trading review.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3 pt-4 border-t border-white/5">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-cyan-400" /> 5. Florida Governing Law &amp;
              Exclusive Jurisdiction
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              These Terms &amp; Conditions and any dispute or claim arising out of or related to
              your use of Trading Bauhaus shall be governed by and construed in accordance with the
              internal laws of the <strong className="text-white">State of Florida</strong>, without
              regard to conflict of law principles.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              Any legal suit, action, or proceeding arising out of or related to these Terms shall
              be instituted exclusively in the federal or state courts located in{" "}
              <strong className="text-white">Miami-Dade County, Florida</strong>. You expressly
              waive any and all objections to the exercise of jurisdiction over you by such courts
              and to venue in such courts.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 pt-4 border-t border-white/5">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-400" /> 6. Limitation of Liability &amp;
              Consequential Damages Waiver
            </h2>
            <p className="text-xs text-slate-300 uppercase leading-relaxed font-mono">
              TO THE MAXIMUM EXTENT PERMITTED UNDER APPLICABLE FLORIDA LAW, IN NO EVENT SHALL
              TRADING BAUHAUS, ITS OPERATORS, AFFILIATES, OR LICENSORS BE LIABLE FOR ANY INDIRECT,
              PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING WITHOUT
              LIMITATION DAMAGES FOR LOSS OF PROFITS, TRADING LOSSES, CAPITAL DEPLETION, BROKER API
              INTERRUPTIONS, OR DATA LOSS, ARISING OUT OF OR IN CONNECTION WITH THE USE OF OR
              INABILITY TO USE THE SERVICE.
            </p>
            <p className="text-xs text-slate-300 uppercase leading-relaxed font-mono">
              IN NO EVENT SHALL OUR AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THESE TERMS
              EXCEED THE GREATER OF THE TOTAL FEES PAID BY YOU TO TRADING BAUHAUS IN THE TWELVE (12)
              MONTHS PRECEDING THE CLAIM OR ONE HUNDRED US DOLLARS ($100.00).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
