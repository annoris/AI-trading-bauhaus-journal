"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Send, CheckCircle2, Terminal, Briefcase, Users } from "lucide-react";
import { Futuristic3DCard } from "@/components/futuristic-3d-card";
import { SocialButtonsRow } from "@/components/social-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ContactUsPage() {
  const [submitted, setSubmitted] = useState(false);
  const [subject, setSubject] = useState("Support / Inquiry");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
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
            Reach out directly to the core engineering team for institutional inquiries, custom broker format requests, or career opportunities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Direct Info */}
          <div className="space-y-6">
            <Futuristic3DCard glowColor="rgba(53, 208, 116, 0.2)" depth={15} className="p-6 space-y-3">
              <Mail className="h-5 w-5 text-brand" />
              <h3 className="text-base font-bold text-white">Direct Communications</h3>
              <p className="text-xs text-slate-400">
                Support, inquiries &amp; feature requests:
              </p>
              <p className="font-mono text-xs text-white">support@tradingbauhaus.com</p>
            </Futuristic3DCard>

            <Futuristic3DCard glowColor="rgba(56, 189, 248, 0.2)" depth={15} className="p-6 space-y-3">
              <Briefcase className="h-5 w-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Careers at Bauhaus</h3>
              <p className="text-xs text-slate-400">
                We are actively looking for quantitative engineers, TypeScript specialists, and full-stack performance architects.
              </p>
              <span className="inline-block font-mono text-[11px] text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">
                Remote Worldwide
              </span>
            </Futuristic3DCard>

            <Futuristic3DCard glowColor="rgba(88, 101, 242, 0.2)" depth={15} className="p-6 space-y-3">
              <Users className="h-5 w-5 text-[#5865F2]" />
              <h3 className="text-base font-bold text-white">Official Community</h3>
              <p className="text-xs text-slate-400">
                Join our Discord community, follow strategy drops on X, or connect with our Instagram:
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
                <div className="py-12 text-center space-y-4">
                  <div className="h-16 w-16 mx-auto rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center text-brand">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Message Transmitted</h3>
                  <p className="text-sm text-slate-400 max-w-md mx-auto">
                    Your dispatch has been securely received by our engineering team. We will review your message shortly.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setSubmitted(false)}
                    className="border-white/20 text-white"
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Reason for Contact
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["Support / Inquiry", "Careers / Join Team", "Broker Format Request", "Partnership"].map((opt) => (
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
                        placeholder="Your name"
                        className="bg-black/40 border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Email Address</label>
                      <Input
                        type="email"
                        required
                        placeholder="trader@domain.com"
                        className="bg-black/40 border-white/10 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Message / Inquiry Details</label>
                    <Textarea
                      required
                      rows={5}
                      placeholder="Describe your inquiry, request, or background..."
                      className="bg-black/40 border-white/10 text-white"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-brand font-semibold text-[#04150b] hover:bg-brand/90 transition shadow-[0_0_20px_rgba(53,208,116,0.3)]"
                  >
                    <Send className="mr-2 h-4 w-4" /> Transmit Secure Message
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
