"use client";

import {
  ShieldCheck,
  Lock,
  HardDrive,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  Scale,
  FileCheck2,
  AlertCircle,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { Futuristic3DCard } from "@/components/futuristic-3d-card";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#080b0a] text-slate-200 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* Navigation & Header */}
        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-brand hover:text-brand/80 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-mono text-brand">
            <Lock className="h-3.5 w-3.5" /> STATE OF FLORIDA · PRIVACY &amp; DATA SECURITY COMPLIANCE
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Privacy Policy &amp; Florida Digital Rights Notice
          </h1>
          <p className="text-base text-slate-400 max-w-3xl leading-relaxed">
            Effective Date: November 2026. This Privacy Policy governs your use of Trading Bauhaus and explains how we
            collect, use, safeguard, and disclose your information in compliance with the{" "}
            <span className="text-white font-medium">Florida Digital Bill of Rights (FDBR, Fla. Stat. § 501.701 et seq.)</span>{" "}
            and the{" "}
            <span className="text-white font-medium">Florida Information Protection Act (FIPA, Fla. Stat. § 501.171)</span>.
          </p>
        </div>

        {/* 3D Security Architecture Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Futuristic3DCard glowColor="rgba(53, 208, 116, 0.3)" depth={25} className="p-6 space-y-4">
            <div className="h-12 w-12 rounded-xl bg-brand/10 border border-brand/30 flex items-center justify-center text-brand">
              <HardDrive className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Physical Multi-Tenant Isolation</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Each invited member is provisioned their own discrete storage database. Trades, executions, and reflection
              journals are physically partitioned and never commingled into a shared multitenant database table.
            </p>
          </Futuristic3DCard>

          <Futuristic3DCard glowColor="rgba(56, 189, 248, 0.3)" depth={25} className="p-6 space-y-4">
            <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <KeyRound className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">AES-256-GCM Encryption</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              API credentials and sync tokens at rest are protected by authenticated AES-256-GCM cryptographic envelopes
              with randomized initialization vectors and cryptographically verified integrity tags.
            </p>
          </Futuristic3DCard>

          <Futuristic3DCard glowColor="rgba(168, 85, 247, 0.3)" depth={25} className="p-6 space-y-4">
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Zero Telemetry &amp; No Data Sale</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              We never sell your personal information, share execution habits with high-frequency trading firms or
              brokers, or monetize your journal data for behavioral advertising.
            </p>
          </Futuristic3DCard>
        </div>

        {/* Florida Statutory Disclosures & Compliance Sections */}
        <div className="space-y-8 rounded-2xl border border-white/10 bg-[#0e1312] p-8 md:p-10 shadow-2xl">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-brand" /> 1. Notice at Collection &amp; Purpose of Processing
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Trading Bauhaus collects personal data strictly to deliver self-directed analytical journaling and performance
              tracking software. The categories of information collected include:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-300">
              <li>
                <strong className="text-white">Account &amp; Authentication Identifiers:</strong> Session identifiers, email
                invitations, and credential hashes necessary to authenticate user access.
              </li>
              <li>
                <strong className="text-white">Trading Records &amp; Fills:</strong> Voluntarily imported trade statements, fill
                executions, contract sizes, timestamps, and fees for portfolio analytics.
              </li>
              <li>
                <strong className="text-white">Qualitative Reflections:</strong> Personal playbooks, psychological mistake tags,
                trade ratings, and annotated chart attachments.
              </li>
              <li>
                <strong className="text-white">Technical Security Logs:</strong> Bounded rate-limiting telemetry, access timestamps,
                and application exception references collected strictly for cybersecurity defense and fraud prevention.
              </li>
            </ul>
          </section>

          {/* Section 2 - Florida Digital Bill of Rights */}
          <section className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-cyan-400">
              <Scale className="h-5 w-5" />
              <h2 className="text-xl font-bold text-white">
                2. Florida Consumer Privacy Rights (Fla. Stat. § 501.701 – § 501.721)
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              If you are a resident of the State of Florida, the Florida Digital Bill of Rights (FDBR) grants you specific
              legal rights regarding your personal data:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-brand" /> Right to Confirm &amp; Access
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You have the right to confirm whether Trading Bauhaus is processing your personal data and to access such
                  personal data at any time.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-brand" /> Right to Correct Inaccuracies
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You have the right to correct any inaccurate personal data or trade executions directly through the platform
                  or by contacting our support team.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-brand" /> Right to Delete
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You have the right to delete personal data provided by or obtained about you, including trades, notes, and
                  associated screenshots.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-brand" /> Right to Data Portability
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You have the right to obtain a complete, machine-readable copy of your data in a portable JSON or CSV format
                  available via one-click export in your settings.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-brand/20 bg-brand/5 p-4 space-y-2 text-xs text-slate-300">
              <strong className="text-white">Non-Discrimination &amp; Prohibition of Sale:</strong> Under Fla. Stat.
              § 501.705, we do not sell your personal data, do not engage in targeted cross-context behavioral advertising,
              and will never discriminate or degrade service quality because you exercise your statutory privacy rights.
            </div>
          </section>

          {/* Section 3 - Security Safeguards & System Integrity Protection */}
          <section className="space-y-3 pt-4 border-t border-white/5">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-brand" /> 3. Information Security Safeguards (FIPA, Fla. Stat. § 501.171)
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              In strict compliance with the Florida Information Protection Act, Trading Bauhaus implements and maintains
              reasonable administrative, technical, and physical safeguards to protect personal identifying information from
              unauthorized access, destruction, use, modification, or disclosure:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-300">
              <li>
                <strong className="text-white">Tenant-Level Database Segregation:</strong> Isolated user data stores ensure zero
                cross-contamination between separate trader accounts.
              </li>
              <li>
                <strong className="text-white">Authenticated Cryptographic Protection:</strong> Industry-standard cryptographic
                ciphers protect stored credentials and tokens.
              </li>
              <li>
                <strong className="text-white">Strict Network Defense:</strong> Content Security Policy (CSP), HTTP Strict
                Transport Security (HSTS), cross-site request forgery (CSRF) defenses, and perimeter rate-limiting protect
                platform infrastructure.
              </li>
            </ul>
            <p className="text-xs text-slate-400 italic">
              System Protection Notice: To protect against unauthorized access and maintain defensive security, detailed internal
              server infrastructure topology, file system directory structures, and private algorithmic key storage details
              are maintained under confidential trade secret protections and are not publicly published.
            </p>
          </section>

          {/* Section 4 - FIPA Breach Notification */}
          <section className="space-y-3 pt-4 border-t border-white/5">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-400" /> 4. Data Breach Notification Protocol (Fla. Stat. § 501.171(4))
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              In the unlikely event of a security breach affecting unencrypted personal identifying information of Florida
              residents, Trading Bauhaus adheres strictly to Florida statutory requirements:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-300">
              <li>
                <strong className="text-white">Consumer Notice:</strong> Written notice will be provided to all affected Florida
                individuals within thirty (30) calendar days of determining that a breach has occurred, without unreasonable
                delay, subject to legitimate law enforcement investigations.
              </li>
              <li>
                <strong className="text-white">Department Notice:</strong> If a breach affects five hundred (500) or more Florida
                residents, written notification will be submitted directly to the Florida Department of Legal Affairs (Office of
                the Florida Attorney General) as mandated by Fla. Stat. § 501.171(3).
              </li>
            </ul>
          </section>

          {/* Section 5 - Data Retention & Disposal */}
          <section className="space-y-3 pt-4 border-t border-white/5">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-brand" /> 5. Data Disposal &amp; Shredding (Fla. Stat. § 501.171(8))
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Customer records containing personal identifying information are retained solely for the period necessary to
              fulfill the analytical services requested by the user. When an account is terminated or an erasure request is
              submitted, customer records are securely shredded and permanently deleted from storage media in a manner that
              renders them unreadable and unrecoverable, compliant with Florida disposal standards.
            </p>
          </section>

          {/* Section 6 - AI Journal Analyst Privacy */}
          <section className="space-y-3 pt-4 border-t border-white/5">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-brand" /> 6. AI Journal Analyst Confidentiality
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Automated analytical completions generated by our AI Journal Analyst modules operate strictly in an isolated
              context scoped solely to the requesting user&apos;s aggregated metrics. We do not use your trades, proprietary
              setups, or reflections to train public foundation models or share insights across workspaces.
            </p>
          </section>

          {/* Section 7 - Submitting Florida Privacy Inquiries */}
          <section className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-white">
              <Mail className="h-5 w-5 text-brand" />
              <h2 className="text-xl font-bold">7. Submitting Privacy Requests &amp; Appeals</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Florida residents may submit verifiable requests to exercise any statutory rights under the Florida Digital Bill of
              Rights by contacting our designated privacy officer:
            </p>
            <div className="rounded-xl border border-white/10 bg-[#080b0a] p-4 space-y-2 text-sm">
              <p className="text-white font-semibold">Trading Bauhaus Privacy Office (Florida Jurisdiction)</p>
              <p className="text-slate-400">
                Email:{" "}
                <a href="mailto:privacy@tradingbauhaus.com" className="text-brand hover:underline font-mono">
                  privacy@tradingbauhaus.com
                </a>
              </p>
              <p className="text-slate-400">
                Response SLA: As provided under Fla. Stat. § 501.705(4), we will respond within forty-five (45) days of
                receipt of a verified consumer request. If reasonably necessary, this period may be extended once by an
                additional forty-five (45) days with timely written notice.
              </p>
              <p className="text-slate-400">
                Right of Appeal: If your consumer request is declined, you have the right to appeal our decision within forty-five
                (45) days of receiving our response by submitting an appeal to the same address.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
