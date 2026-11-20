export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChartNoAxesCombined,
  Check,
  CircleDollarSign,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { InvitationCourier } from "@/components/invitation-courier";
import { FuturisticFooter } from "@/components/futuristic-footer";
import { DiscordIcon } from "@/components/social-links";
import { SolanaContributionGate } from "@/components/solana-contribution-gate";
import "./marketing.css";

export const metadata = {
  title: "Trading Bauhaus — An AI analyst grounded in your journal",
  description:
    "Ask an optional AI analyst about your trade history. Answers cite journal metrics, flag missing data, and help focus your next review. Try the read-only demo; private journals are by owner invitation.",
};

const features = [
  {
    icon: ChartNoAxesCombined,
    label: "01 / PERFORMANCE",
    title: "Find the pattern behind the result.",
    body: "Compare strategies, timing, mistakes, and trade outcomes with reports built from your own execution history.",
    image: "reports-crisp.png",
    alt: "Trading Bauhaus reports page with performance analysis and trade breakdowns",
  },
  {
    icon: NotebookPen,
    label: "02 / DAILY REVIEW",
    title: "Keep the context around the trade.",
    body: "Write daily journal notes, attach supporting files, and review the routines that shape your process.",
    image: "journal-crisp.png",
    alt: "Trading Bauhaus daily journal with notes and session context",
  },
  {
    icon: CircleDollarSign,
    label: "03 / FUNDED JOURNEY",
    title: "Track costs and cash received.",
    body: "Keep evaluations, resets, payout requests, partial receipts, and reversals in a dedicated prop-firm ledger.",
    image: "prop-firms-crisp.png",
    alt: "Trading Bauhaus prop-firm tracker for account costs and payouts",
  },
];

const steps = [
  {
    number: "01",
    title: "Bring in your trades",
    body: "Connect a supported broker, import a statement, or add trades manually.",
  },
  {
    number: "02",
    title: "Review what happened",
    body: "Use the calendar, reports, and trade details to see the session in context.",
  },
  {
    number: "03",
    title: "Carry one lesson forward",
    body: "Capture your decisions and turn the review into a focus for the next session.",
  },
];

function ProductPreview() {
  return (
    <figure className="landing-preview">
      <div className="preview-frame">
        <div className="preview-toolbar" aria-hidden="true">
          <span className="preview-dots">
            <i />
            <i />
            <i />
          </span>
          <span>TRADING BAUHAUS / DASHBOARD</span>
          <ShieldCheck size={15} />
        </div>
        <img
          src="/product-previews/dashboard-crisp.png"
          alt="Trading Bauhaus dashboard showing journal analytics and the AI Journal Analyst panel"
          fetchPriority="high"
        />
      </div>
      <figcaption>
        <span className="preview-caption-mark" />
        Product screen · generated demo records
      </figcaption>
    </figure>
  );
}

export default function Welcome() {
  return (
    <div className="bauhaus-marketing" id="top">
      <header className="marketing-nav">
        <Link href="/welcome" className="marketing-wordmark" aria-label="Trading Bauhaus home">
          <span>TRADING</span>
          <strong>
            BAUHAUS<span>•</span>
          </strong>
        </Link>
        <nav aria-label="Page sections">
          <a href="#features">The workspace</a>
          <a href="#reflection">AI reflection</a>
          <a href="#process">Your process</a>
          <Link href="/comparisons">Comparisons</Link>
          <a href="#access">Demo &amp; access</a>
        </nav>
        <div className="invite-badge">
          <span />
          Private journal · invite only
        </div>
      </header>

      <main>
        <section className="marketing-hero">
          <div className="hero-copy">
            <p className="marketing-kicker">
              <span /> AI JOURNAL ANALYST · GROUNDED IN YOUR TRADING RECORD
            </p>
            <h1>
              An AI analyst
              <br />
              grounded in
              <br />
              <em>your journal.</em>
            </h1>
            <p className="marketing-lead">
              Ask about playbooks, timing, mistakes, and risk. Answers cite the journal metrics they
              use, flag missing data, and help you choose the next point to review.
            </p>
            <div className="marketing-cta">
              <Link href="/dashboard" className="marketing-button">
                Explore Demo Dashboard <ArrowRight size={18} />
              </Link>
            </div>
            <p className="hero-access">
              <ShieldCheck size={15} /> Demo is read-only ·{" "}
              <a
                href="https://discord.gg/RUbBagUDA6"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5865F2] hover:underline font-semibold"
              >
                Request private journal invite on Discord →
              </a>
            </p>
            <p className="hero-access">
              <Sparkles size={15} /> Optional AI · bring your OpenAI or Anthropic API key.
            </p>
            <div className="hero-proof" aria-label="Journal capabilities">
              <span>
                <Check size={14} /> Answers cite journal metrics
              </span>
              <span>
                <Check size={14} /> Patterns by playbook, time &amp; mistake
              </span>
              <span>
                <Check size={14} /> Missing data called out
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-coordinate visual-coordinate-top">PROCESS / 01</div>
            <div className="visual-coordinate visual-coordinate-bottom">REVIEW → REFINE</div>
            <div className="visual-orbit visual-orbit-one" />
            <div className="visual-orbit visual-orbit-two" />
            <div className="visual-crosshair" aria-hidden="true">
              <span />
              <span />
            </div>
            <ProductPreview />
          </div>
        </section>

        <section id="features" className="feature-section">
          <div className="section-heading">
            <p className="marketing-kicker">A WORKSPACE BUILT AROUND YOUR PROCESS</p>
            <h2>
              One record.
              <br />
              <span>More useful questions.</span>
            </h2>
            <p>
              Bring execution, daily reflection, and the funded journey into one place you can
              return to.
            </p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article className="feature-card" key={feature.label}>
                  <div className="feature-copy">
                    <div className="feature-topline">
                      <Icon size={19} strokeWidth={1.8} />
                      <span>{feature.label}</span>
                    </div>
                    <h3>{feature.title}</h3>
                    <p>{feature.body}</p>
                  </div>
                  <div className="feature-image">
                    <img
                      src={`/product-previews/${feature.image}`}
                      alt={feature.alt}
                      loading="lazy"
                    />
                  </div>
                </article>
              );
            })}
          </div>
          <p className="feature-data-note">
            Product screens use generated demo records, not a real trading account.
          </p>
        </section>

        <section id="reflection" className="reflection-section">
          <div className="reflection-symbol" aria-hidden="true">
            <div className="reflection-ring">
              <Sparkles size={27} strokeWidth={1.5} />
            </div>
            <span className="reflection-spark reflection-spark-one" />
            <span className="reflection-spark reflection-spark-two" />
            <span className="reflection-spark reflection-spark-three" />
          </div>
          <div className="reflection-copy">
            <p className="marketing-kicker">AI JOURNAL ANALYST · OPTIONAL</p>
            <h2>
              Ask better questions
              <br />
              <em>of your own record.</em>
            </h2>
            <p>
              Answers use trade aggregates from your selected accounts and filters, and cite the
              metrics behind each pattern. When your journal cannot support a conclusion, the
              Analyst says what is missing instead of guessing—so you know what to review next.
            </p>
            <div className="reflection-note">
              <Target size={16} />
              <span>Requires your own OpenAI or Anthropic API key in Settings.</span>
            </div>
          </div>
          <div
            className="reflection-card"
            aria-label="Examples of questions for the AI Journal Analyst"
          >
            <div className="reflection-card-heading">
              <Sparkles size={16} />
              <span>ASK YOUR JOURNAL</span>
            </div>
            <div className="reflection-question">
              <span>01</span>
              <p>Which mistakes cost me the most this month?</p>
              <ArrowUpRight size={15} />
            </div>
            <div className="reflection-question">
              <span>02</span>
              <p>How does my performance change by weekday?</p>
              <ArrowUpRight size={15} />
            </div>
            <div className="reflection-question">
              <span>03</span>
              <p>What risk information is missing from my journal?</p>
              <ArrowUpRight size={15} />
            </div>
            <p className="reflection-disclaimer">
              Example prompts · answers depend on your recorded data
            </p>
          </div>
        </section>

        <section id="process" className="process-section">
          <div className="section-heading">
            <p className="marketing-kicker">A SIMPLE LOOP TO RETURN TO</p>
            <h2>
              Before. During. After.
              <br />
              <span>Make the review part of the work.</span>
            </h2>
          </div>
          <div className="process-grid">
            {steps.map((step) => (
              <article className="process-step" key={step.number}>
                <span className="process-number">{step.number}</span>
                <div className="process-line" aria-hidden="true" />
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
          <div className="process-summary">
            <BookOpen size={17} />
            <span>Keep the plan, the execution, and the lesson connected.</span>
          </div>
        </section>

        <section id="access" className="access-section">
          <div className="access-copy">
            <div className="access-lockup">
              <span className="access-shield">
                <ShieldCheck size={19} />
              </span>
              <p className="marketing-kicker">LIVE DEMO · PRIVATE JOURNAL</p>
            </div>
            <h2>Explore the real workspace. Keep your own records private.</h2>
            <p>
              The demo opens the actual Trading Bauhaus app with generated example data. It is
              read-only; editing controls are disabled while you explore. To request your own
              private journal, join our Discord community to request an invitation directly from the
              team.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href="https://discord.gg/RUbBagUDA6"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#5865F2] px-5 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(88,101,242,0.35)] transition hover:bg-[#4752c4] hover:shadow-[0_0_25px_rgba(88,101,242,0.5)]"
              >
                <DiscordIcon className="h-4 w-4" />
                <span>Request Invitation on Discord</span>
                <ArrowRight size={16} />
              </a>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                Explore Demo Dashboard
              </Link>
            </div>
            <div className="access-readonly-label">
              <ShieldCheck size={14} />
              <span>Demo · generated data · read-only</span>
            </div>
            <div className="mt-6">
              <SolanaContributionGate mode="invitation" />
            </div>
          </div>
          <InvitationCourier />
        </section>
      </main>

      <FuturisticFooter />
    </div>
  );
}
