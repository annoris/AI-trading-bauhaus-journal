"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Send,
  CheckCircle2,
  Terminal,
  Briefcase,
  Users,
  Wallet,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { Futuristic3DCard } from "@/components/futuristic-3d-card";
import { SocialButtonsRow } from "@/components/social-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const SUPPORT_EMAIL = "support@tradingbauhaus.com";
const SOLANA_WALLET = "3HvUMCUSSHEdtA35UuD4J7mbgpTxJ7LgT2X7GfdzvBdm";

export default function ContactUsPage() {
  const [submitted, setSubmitted] = useState(false);
  const [subject, setSubject] = useState("Support / Inquiry");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [txSignature, setTxSignature] = useState("");
  const [copiedDispatch, setCopiedDispatch] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);

  const formattedDispatch = [
    `Subject: [Trading Bauhaus] ${subject}`,
    `Name: ${name.trim()}`,
    `Email: ${email.trim()}`,
    txSignature.trim() ? `Solana Contributor Tx: ${txSignature.trim()}` : null,
    "",
    message.trim(),
  ]
    .filter((line) => line !== null)
    .join("\n");

  const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `[Trading Bauhaus] ${subject}`,
  )}&body=${encodeURIComponent(formattedDispatch)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await navigator.clipboard?.writeText(formattedDispatch);
      setCopiedDispatch(true);
    } catch {
      // Clipboard API may be restricted in some contexts
    }
    window.location.href = mailtoHref;
    setSubmitted(true);
  };

  const handleCopyWallet = async () => {
    try {
      await navigator.clipboard?.writeText(SOLANA_WALLET);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2500);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleCopyDispatch = async () => {
    try {
      await navigator.clipboard?.writeText(formattedDispatch);
      setCopiedDispatch(true);
      setTimeout(() => setCopiedDispatch(false), 2500);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <div className="min-h-screen bg-[#080b0a] text-slate-200 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-brand hover:text-brand/80 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-mono text-brand">
            <Terminal className="h-3.5 w-3.5" /> SECURE DISPATCH TERMINAL
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Contact &amp; Engineering Careers
          </h1>
          <p className="text-base text-slate-400 max-w-2xl">
            Reach out directly to the core engineering team for institutional inquiries, commercial
            licensing, custom broker format requests, or career opportunities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Direct Info */}
          <div className="space-y-6">
            <Futuristic3DCard
              glowColor="rgba(53, 208, 116, 0.2)"
              depth={15}
              className="p-6 space-y-3"
            >
              <Mail className="h-5 w-5 text-brand" />
              <h3 className="text-base font-bold text-white">Direct Communications</h3>
              <p className="text-xs text-slate-400">Support, inquiries &amp; feature requests:</p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="block font-mono text-xs text-white hover:text-brand transition break-all"
              >
                {SUPPORT_EMAIL}
              </a>
            </Futuristic3DCard>

            <Futuristic3DCard
              glowColor="rgba(168, 85, 247, 0.22)"
              depth={15}
              className="p-6 space-y-3"
            >
              <Wallet className="h-5 w-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">Priority Contributor Support</h3>
              <p className="text-xs text-slate-400">
                Official Solana (SOL / USDC-SPL) contribution &amp; commercial licensing wallet:
              </p>
              <div className="rounded-md bg-black/50 border border-white/10 p-2 font-mono text-[11px] text-purple-300 break-all">
                {SOLANA_WALLET}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyWallet}
                  className="inline-flex items-center gap-1.5 rounded bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/20 transition"
                >
                  {copiedWallet ? (
                    <Check className="h-3 w-3 text-brand" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copiedWallet ? "Copied" : "Copy Wallet"}
                </button>
                <a
                  href={`https://solscan.io/account/${SOLANA_WALLET}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-purple-400 hover:text-purple-300 transition"
                >
                  Solscan <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </Futuristic3DCard>

            <Futuristic3DCard
              glowColor="rgba(56, 189, 248, 0.2)"
              depth={15}
              className="p-6 space-y-3"
            >
              <Briefcase className="h-5 w-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Careers at Bauhaus</h3>
              <p className="text-xs text-slate-400">
                We are actively looking for quantitative engineers, TypeScript specialists, and
                full-stack performance architects.
              </p>
              <span className="inline-block font-mono text-[11px] text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">
                Remote Worldwide
              </span>
            </Futuristic3DCard>

            <Futuristic3DCard
              glowColor="rgba(88, 101, 242, 0.2)"
              depth={15}
              className="p-6 space-y-3"
            >
              <Users className="h-5 w-5 text-[#5865F2]" />
              <h3 className="text-base font-bold text-white">Official Community</h3>
              <p className="text-xs text-slate-400">
                Join our Discord community, follow strategy drops on X, or connect with our
                Instagram:
              </p>
              <div className="pt-1">
                <SocialButtonsRow size="sm" />
              </div>
            </Futuristic3DCard>
          </div>

          {/* Right Column: Interactive Dispatch Form */}
          <div className="md:col-span-2">
            <Futuristic3DCard glowColor="rgba(53, 208, 116, 0.25)" depth={20} className="p-8">
              {submitted ? (
                <div className="py-8 text-center space-y-5">
                  <div className="h-16 w-16 mx-auto rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center text-brand">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Dispatch Prepared &amp; Mail Client Opened
                  </h3>
                  <p className="text-sm text-slate-400 max-w-md mx-auto">
                    Your formatted inquiry has been copied to your clipboard and routed to your
                    email client addressed to{" "}
                    <span className="font-mono text-white">{SUPPORT_EMAIL}</span>.
                  </p>
                  <div className="text-left rounded-lg bg-black/50 border border-white/10 p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {formattedDispatch}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <a
                      href={mailtoHref}
                      className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-xs font-semibold text-[#04150b] hover:bg-brand/90 transition"
                    >
                      <Mail className="h-4 w-4" /> Open Email Client Again
                    </a>
                    <Button
                      variant="outline"
                      onClick={handleCopyDispatch}
                      className="border-white/20 text-white text-xs"
                    >
                      {copiedDispatch ? (
                        <Check className="mr-1.5 h-3.5 w-3.5 text-brand" />
                      ) : (
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {copiedDispatch ? "Dispatch Copied" : "Copy Formatted Dispatch"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSubmitted(false)}
                      className="border-white/20 text-slate-300 text-xs"
                    >
                      Edit Message
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Reason for Contact
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Support / Inquiry",
                        "Commercial License / Solana Pass",
                        "Careers / Join Team",
                        "Broker Format Request",
                        "Partnership",
                      ].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSubject(opt)}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                            subject === opt
                              ? "bg-brand text-[#04150b] font-semibold"
                              : "bg-white/5 text-slate-400 hover:bg-white/10"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Name</label>
                      <Input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="bg-black/40 border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Email Address</label>
                      <Input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="trader@domain.com"
                        className="bg-black/40 border-white/10 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Solana Contribution Signature{" "}
                      <span className="text-slate-500 font-normal">
                        (Optional — for priority contributor support)
                      </span>
                    </label>
                    <Input
                      value={txSignature}
                      onChange={(e) => setTxSignature(e.target.value)}
                      placeholder={`Tx hash sent to ${SOLANA_WALLET.slice(0, 8)}...`}
                      className="bg-black/40 border-white/10 text-white font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Message / Inquiry Details
                    </label>
                    <Textarea
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your inquiry, request, or background..."
                      className="bg-black/40 border-white/10 text-white"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-brand font-semibold text-[#04150b] hover:bg-brand/90 transition shadow-[0_0_20px_rgba(53,208,116,0.3)]"
                  >
                    <Send className="mr-2 h-4 w-4" /> Prepare &amp; Launch Email Dispatch
                  </Button>
                </form>
              )}
            </Futuristic3DCard>
          </div>
        </div>
      </div>
    </div>
  );
}
