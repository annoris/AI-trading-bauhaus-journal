"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  buildSolanaPayUri,
  DEFAULT_MIN_CONTRIBUTION_LAMPORTS,
  DEFAULT_MIN_CONTRIBUTION_SOL,
  encodeBase58,
  formatSolanaExplorerUrl,
  isValidTransactionSignature,
  shortenSolanaIdentifier,
  SOLANA_RECIPIENT_WALLET,
  type SolanaContributionConfigPayload,
  type SolanaLicenseStatus,
} from "@/lib/solana-payment";
import { cn } from "@/lib/utils";

type SolanaProvider = {
  isPhantom?: boolean;
  isSolflare?: boolean;
  connect?: () => Promise<{ publicKey?: { toString?: () => string } }>;
  signMessage?: (
    message: Uint8Array,
    display?: string,
  ) => Promise<{ signature: Uint8Array } | Uint8Array>;
};

function getInjectedSolanaProvider(): SolanaProvider | null {
  if (typeof window === "undefined") return null;
  const win = window as typeof window & {
    phantom?: { solana?: SolanaProvider };
    solflare?: SolanaProvider;
    solana?: SolanaProvider;
  };
  return win.phantom?.solana ?? win.solana ?? win.solflare ?? null;
}

const FALLBACK_CONFIG: SolanaContributionConfigPayload = {
  recipientWallet: SOLANA_RECIPIENT_WALLET,
  minContributionSol: DEFAULT_MIN_CONTRIBUTION_SOL,
  minContributionLamports: DEFAULT_MIN_CONTRIBUTION_LAMPORTS,
  challengeMemo: "TBJ-LOADING...",
  signingMessage: `Trading Bauhaus Solana Contribution Proof\nRecipient: ${SOLANA_RECIPIENT_WALLET}`,
  solanaPayUri: buildSolanaPayUri({
    recipient: SOLANA_RECIPIENT_WALLET,
    amountSol: DEFAULT_MIN_CONTRIBUTION_SOL,
  }),
  licenseStatus: {
    active: false,
    enforced: false,
    recipientWallet: SOLANA_RECIPIENT_WALLET,
    txSignature: null,
    senderWallet: null,
    lamports: null,
    solAmount: null,
    proofType: null,
    verifiedAt: null,
  },
};

export function SolanaContributionGate({
  mode = "workspace",
  compact = false,
  className,
}: {
  mode?: "invitation" | "workspace";
  compact?: boolean;
  className?: string;
}) {
  const [config, setConfig] = useState<SolanaContributionConfigPayload>(FALLBACK_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [txSignature, setTxSignature] = useState("");
  const [email, setEmail] = useState("");
  const [walletSignature, setWalletSignature] = useState("");
  const [showSignatureFallback, setShowSignatureFallback] = useState(false);
  const [copiedField, setCopiedField] = useState<"wallet" | "memo" | "message" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signingWallet, setSigningWallet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mintedInvitation, setMintedInvitation] = useState<{
    token: string;
    email: string;
    acceptUrl: string;
  } | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch("/api/solana/contribution", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as SolanaContributionConfigPayload;
      if (data && data.recipientWallet) {
        setConfig(data);
      }
    } catch {
      // Keep fallback config if offline
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  const copyText = async (value: string, field: "wallet" | "memo" | "message") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const signWithInjectedWallet = async () => {
    setError(null);
    const provider = getInjectedSolanaProvider();
    if (!provider || typeof provider.signMessage !== "function") {
      setShowSignatureFallback(true);
      setError(
        "No injected Solana wallet (Phantom or Solflare) detected in this browser. Paste a detached Base58 signature below or include the challenge memo in your transaction.",
      );
      return;
    }
    setSigningWallet(true);
    try {
      if (typeof provider.connect === "function") {
        await provider.connect();
      }
      const encodedMessage = new TextEncoder().encode(config.signingMessage);
      const signed = await provider.signMessage(encodedMessage, "utf8");
      const rawSig = signed instanceof Uint8Array ? signed : signed.signature;
      if (!rawSig || rawSig.length !== 64) {
        throw new Error("Wallet did not return a valid 64-byte Ed25519 signature.");
      }
      setWalletSignature(encodeBase58(rawSig));
      setShowSignatureFallback(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet message signing was cancelled.");
    } finally {
      setSigningWallet(false);
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedSig = txSignature.trim();
    if (!isValidTransactionSignature(trimmedSig)) {
      setError(
        "Enter a valid 64-byte Base58 Solana transaction signature (87–88 characters from Solscan, Phantom, or Solflare).",
      );
      return;
    }

    if (mode === "invitation" && !email.trim()) {
      setError("Enter the email address for your private Trading Bauhaus journal.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/solana/contribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txSignature: trimmedSig,
          walletSignature: walletSignature.trim() || undefined,
          signedMessage: config.signingMessage,
          email: mode === "invitation" ? email.trim() : undefined,
          issueInvitation: mode === "invitation",
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        verified?: boolean;
        licenseStatus?: SolanaLicenseStatus;
        invitation?: { token: string; email: string; acceptUrl: string } | null;
      };
      if (!response.ok || !payload.verified) {
        throw new Error(payload.error || "On-chain verification failed.");
      }
      if (payload.licenseStatus) {
        setConfig((prev) => ({ ...prev, licenseStatus: payload.licenseStatus! }));
      }
      if (payload.invitation) {
        setMintedInvitation(payload.invitation);
      }
      setTxSignature("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify Solana transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  const { licenseStatus } = config;

  return (
    <div
      className={cn(
        "rounded-2xl border border-emerald-500/25 bg-[#0b120f]/95 p-5 text-[#f1f4f1] shadow-[0_0_35px_rgba(16,185,129,0.08)]",
        compact && "p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wider text-emerald-300 uppercase">
            <Wallet className="h-3.5 w-3.5" />
            <span>Solana On-Chain Contributor Gate</span>
          </div>
          <h3
            className={cn(
              "font-semibold tracking-tight text-white",
              compact ? "text-sm" : "text-base",
            )}
          >
            {mode === "invitation"
              ? "Unlock instant private journal access via Solana"
              : "Trading Bauhaus Contributor License"}
          </h3>
          <p className="text-xs leading-relaxed text-white/65">
            {mode === "invitation"
              ? `Contribute ≥ ${config.minContributionSol} SOL to the official project treasury and verify your finalized Mainnet-Beta transaction on-chain to mint an instant invitation.`
              : `Verify a finalized Solana Mainnet-Beta contribution (≥ ${config.minContributionSol} SOL) to activate a cryptographic contributor license bound to this workspace.`}
          </p>
        </div>

        {licenseStatus.active && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            <span>Verified on Solana</span>
          </div>
        )}
      </div>

      {licenseStatus.active && mode === "workspace" && (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 text-xs space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-emerald-200">
              Active Contributor License · {licenseStatus.solAmount ?? config.minContributionSol}{" "}
              SOL
            </span>
            {licenseStatus.txSignature && (
              <a
                href={formatSolanaExplorerUrl(licenseStatus.txSignature)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-300 hover:underline font-mono"
              >
                {shortenSolanaIdentifier(licenseStatus.txSignature, 6)}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/65">
            {licenseStatus.senderWallet && (
              <span>
                Sender:{" "}
                <code className="font-mono text-white/85">
                  {shortenSolanaIdentifier(licenseStatus.senderWallet, 6)}
                </code>
              </span>
            )}
            {licenseStatus.proofType && (
              <span>
                Anti-replay proof:{" "}
                <code className="font-mono text-emerald-300">{licenseStatus.proofType}</code>
              </span>
            )}
          </div>
        </div>
      )}

      {mintedInvitation && (
        <div className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-500/15 p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-200 font-semibold text-sm">
            <ShieldCheck className="h-5 w-5 text-emerald-300 shrink-0" />
            <span>On-Chain Contribution Verified — Invitation Minted!</span>
          </div>
          <p className="text-xs text-white/80">
            Your single-use invitation for{" "}
            <strong className="text-white">{mintedInvitation.email}</strong> is ready.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={mintedInvitation.acceptUrl}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
            >
              <span>Create Your Private Journal Now →</span>
            </Link>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              1. Official Solana Wallet (SOL)
            </span>
            <button
              type="button"
              onClick={() => void copyText(config.recipientWallet, "wallet")}
              className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/80 transition hover:bg-white/10"
            >
              {copiedField === "wallet" ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copy
                </>
              )}
            </button>
          </div>
          <code className="mt-1.5 block break-all font-mono text-xs text-emerald-300 select-all">
            {config.recipientWallet}
          </code>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/55">
            <span>Min: {config.minContributionSol} SOL (Mainnet-Beta)</span>
            <a
              href={config.solanaPayUri}
              className="inline-flex items-center gap-1 text-emerald-300 hover:underline font-medium"
            >
              Open in Solana Pay <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              2. Anti-Replay Memo Challenge
            </span>
            <button
              type="button"
              onClick={() => void copyText(config.challengeMemo, "memo")}
              disabled={loadingConfig}
              className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
            >
              {copiedField === "memo" ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copy Memo
                </>
              )}
            </button>
          </div>
          <code className="mt-1.5 block font-mono text-sm font-bold tracking-wide text-amber-300 select-all">
            {config.challengeMemo}
          </code>
          <p className="mt-1.5 text-[11px] text-white/55">
            Include this memo in your transfer, or{" "}
            <button
              type="button"
              onClick={() => setShowSignatureFallback((v) => !v)}
              className="text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
            >
              prove wallet ownership with a signature
            </button>
            .
          </p>
        </div>
      </div>

      {showSignatureFallback && (
        <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/5 p-3 space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-amber-200 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" />
              Sent SOL without a memo? Sign the challenge with the sender wallet:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void copyText(config.signingMessage, "message")}
                className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/80 hover:bg-white/10"
              >
                {copiedField === "message" ? "Copied message" : "Copy message"}
              </button>
              <button
                type="button"
                onClick={() => void signWithInjectedWallet()}
                disabled={signingWallet}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/20 border border-amber-400/40 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-400/30"
              >
                {signingWallet ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                <span>Sign with Phantom / Solflare</span>
              </button>
            </div>
          </div>
          <input
            type="text"
            value={walletSignature}
            onChange={(e) => setWalletSignature(e.target.value)}
            placeholder="Detached Ed25519 wallet signature (Base58) — auto-filled when signing above"
            className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 font-mono text-xs text-white placeholder:text-white/35 focus:border-emerald-400 focus:outline-none"
          />
        </div>
      )}

      <form onSubmit={handleVerify} className="mt-3 space-y-2.5">
        {mode === "invitation" && (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address (to receive your instant journal invitation)"
            required
            className="w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-xs text-white placeholder:text-white/40 focus:border-emerald-400 focus:outline-none"
          />
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={txSignature}
            onChange={(e) => setTxSignature(e.target.value)}
            placeholder="Paste finalized Solana Mainnet transaction signature (5K8...)"
            required
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 font-mono text-xs text-white placeholder:text-white/40 focus:border-emerald-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Verifying on Solana...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>{mode === "invitation" ? "Verify & Unlock Invite" : "Verify On-Chain"}</span>
              </>
            )}
          </button>
        </div>
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

export function SolanaContributorBadge({ collapsed = false }: { collapsed?: boolean }) {
  const [status, setStatus] = useState<SolanaLicenseStatus | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/solana/contribution", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SolanaContributionConfigPayload | null) => {
        if (active && data?.licenseStatus) {
          setStatus(data.licenseStatus);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const verified = status?.active === true;

  return (
    <Link
      href="/settings#solana-license"
      title={
        verified
          ? `Solana Contributor Verified (${status?.solAmount ?? DEFAULT_MIN_CONTRIBUTION_SOL} SOL)`
          : `Support Trading Bauhaus via Solana (${SOLANA_RECIPIENT_WALLET})`
      }
      className={cn(
        "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
        verified
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {verified ? (
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
      ) : (
        <Wallet className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      )}
      {!collapsed && (
        <span className="truncate">{verified ? "Solana Contributor" : "Solana License"}</span>
      )}
    </Link>
  );
}
