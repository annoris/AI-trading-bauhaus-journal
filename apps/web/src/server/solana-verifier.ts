import { createPublicKey, verify as cryptoVerify } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  db,
  journalCredentialScope,
  runWithDefaultDatabase,
  settings,
  solanaContributions,
} from "@/db";
import { decryptJson, encryptJson, hashPrivateIdentifier } from "@/server/crypto";
import { RequestError } from "@/server/api";
import {
  buildSolanaPayUri,
  decodeBase58,
  DEFAULT_MIN_CONTRIBUTION_LAMPORTS,
  DEFAULT_MIN_CONTRIBUTION_SOL,
  isValidSolanaAddress,
  isValidTransactionSignature,
  LAMPORTS_PER_SOL,
  SOLANA_RECIPIENT_WALLET,
  SPL_MEMO_PROGRAM_ID,
  SPL_MEMO_V1_PROGRAM_ID,
  type SolanaContributionConfigPayload,
  type SolanaLicenseStatus,
} from "@/lib/solana-payment";

export const SOLANA_LICENSE_SETTING_KEY = "solana_contribution_license";

/**
 * RFC 8410 SubjectPublicKeyInfo (SPKI) DER prefix for a raw 32-byte Ed25519 public key.
 */
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export type DerivedContributionChallenge = {
  scopeKey: string;
  challengeMemo: string;
  signingMessage: string;
};

export type VerifiedSolanaContribution = {
  txSignature: string;
  recipientWallet: string;
  senderWallet: string;
  lamports: number;
  slot: number;
  blockTime: number | null;
  challengeMemo: string;
  proofType: "memo" | "wallet_signature";
  redeemedByScope: string;
  verifiedAt: string;
};

type EncryptedLicenseEnvelope = {
  version: 1;
  txSignature: string;
  recipientWallet: string;
  senderWallet: string;
  lamports: number;
  slot: number;
  blockTime: number | null;
  challengeMemo: string;
  proofType: "memo" | "wallet_signature";
  redeemedByScope: string;
  licenseTokenHash: string;
  verifiedAt: string;
};

export function configuredMinContributionLamports(): number {
  const raw = process.env.JOURNAL_SOLANA_MIN_SOL;
  if (!raw) return DEFAULT_MIN_CONTRIBUTION_LAMPORTS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MIN_CONTRIBUTION_LAMPORTS;
  return Math.round(parsed * LAMPORTS_PER_SOL);
}

export function isSolanaContributionEnforced(): boolean {
  return process.env.JOURNAL_REQUIRE_SOLANA_CONTRIBUTION === "true";
}

/**
 * Derives an unforgeable instance-bound challenge code (`TBJ-<16-HEX>`) using the
 * server's private HMAC key material so attackers cannot pre-compute or spoof memos.
 */
export function deriveContributionChallenge(scopeKey?: string): DerivedContributionChallenge {
  const resolvedScope = (scopeKey?.trim() || journalCredentialScope() || "owner").toLowerCase();
  const digest = hashPrivateIdentifier("solana-contribution-challenge-v1", resolvedScope);
  const challengeMemo = `TBJ-${digest.slice(0, 16).toUpperCase()}`;
  const signingMessage = [
    "Trading Bauhaus Solana Contribution Proof",
    `Recipient: ${SOLANA_RECIPIENT_WALLET}`,
    `Challenge: ${challengeMemo}`,
  ].join("\n");
  return {
    scopeKey: resolvedScope,
    challengeMemo,
    signingMessage,
  };
}

function decodeSignatureBytes(signatureInput: string): Uint8Array | null {
  const trimmed = signatureInput.trim();
  if (!trimmed) return null;
  try {
    const b58 = decodeBase58(trimmed);
    if (b58.length === 64) return b58;
  } catch {
    // Fall back to base64 decoding if a wallet adapter returned base64
  }
  try {
    const b64 = Buffer.from(trimmed, "base64");
    if (b64.length === 64) return new Uint8Array(b64);
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Verifies a detached Ed25519 signature produced by a Solana wallet (e.g., Phantom / Solflare
 * `signMessage`) using Node's built-in `node:crypto` subsystem.
 */
export function verifySolanaWalletSignature(params: {
  walletAddress: string;
  message: string;
  signature: string;
}): boolean {
  const { walletAddress, message, signature } = params;
  if (!isValidSolanaAddress(walletAddress)) return false;
  const sigBytes = decodeSignatureBytes(signature);
  if (!sigBytes || sigBytes.length !== 64) return false;

  try {
    const pubkeyBytes = decodeBase58(walletAddress.trim());
    if (pubkeyBytes.length !== 32) return false;
    const derKey = Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(pubkeyBytes)]);
    const publicKey = createPublicKey({
      key: derKey,
      format: "der",
      type: "spki",
    });
    return cryptoVerify(null, Buffer.from(message, "utf8"), publicKey, Buffer.from(sigBytes));
  } catch {
    return false;
  }
}

type RpcTransactionResult = {
  slot?: number;
  blockTime?: number | null;
  meta?: {
    err: unknown;
    preBalances?: number[];
    postBalances?: number[];
    logMessages?: string[];
    innerInstructions?: Array<{
      instructions?: Array<Record<string, unknown>>;
    }>;
    loadedAddresses?: {
      writable?: unknown[];
      readonly?: unknown[];
    };
  } | null;
  transaction?: {
    message?: {
      accountKeys?: Array<string | { pubkey?: string; signer?: boolean }>;
      instructions?: Array<Record<string, unknown>>;
    };
  };
} | null;

function extractAccountKeyStrings(tx: NonNullable<RpcTransactionResult>): string[] {
  const rawKeys = tx.transaction?.message?.accountKeys ?? [];
  const keys = rawKeys.map((entry) =>
    typeof entry === "string" ? entry : typeof entry?.pubkey === "string" ? entry.pubkey : "",
  );
  const loadedWritable = (tx.meta?.loadedAddresses?.writable ?? []).map((entry) =>
    typeof entry === "string"
      ? entry
      : typeof (entry as { pubkey?: string })?.pubkey === "string"
        ? (entry as { pubkey: string }).pubkey
        : "",
  );
  const loadedReadonly = (tx.meta?.loadedAddresses?.readonly ?? []).map((entry) =>
    typeof entry === "string"
      ? entry
      : typeof (entry as { pubkey?: string })?.pubkey === "string"
        ? (entry as { pubkey: string }).pubkey
        : "",
  );
  return [...keys, ...loadedWritable, ...loadedReadonly];
}

function collectAllInstructions(
  tx: NonNullable<RpcTransactionResult>,
): Array<Record<string, unknown>> {
  const topLevel = tx.transaction?.message?.instructions ?? [];
  const inner = (tx.meta?.innerInstructions ?? []).flatMap((group) => group.instructions ?? []);
  return [...topLevel, ...inner];
}

function extractMemosFromTransaction(tx: NonNullable<RpcTransactionResult>): string[] {
  const memos: string[] = [];
  for (const ix of collectAllInstructions(tx)) {
    const program = typeof ix.program === "string" ? ix.program : "";
    const programId = typeof ix.programId === "string" ? ix.programId : "";
    const isMemoProgram =
      program === "spl-memo" ||
      programId === SPL_MEMO_PROGRAM_ID ||
      programId === SPL_MEMO_V1_PROGRAM_ID;
    if (isMemoProgram) {
      if (typeof ix.parsed === "string") {
        memos.push(ix.parsed);
      } else if (typeof ix.data === "string") {
        try {
          const decoded = Buffer.from(decodeBase58(ix.data)).toString("utf8");
          if (decoded) memos.push(decoded);
        } catch {
          // Ignore malformed data
        }
      }
    }
  }
  for (const log of tx.meta?.logMessages ?? []) {
    if (typeof log === "string") {
      memos.push(log);
    }
  }
  return memos;
}

function extractTransferToRecipient(
  tx: NonNullable<RpcTransactionResult>,
  accountKeys: string[],
): { receivedLamports: number; senderWallet: string | null } {
  let instructionLamports = 0;
  let instructionSender: string | null = null;

  for (const ix of collectAllInstructions(tx)) {
    const program = typeof ix.program === "string" ? ix.program : "";
    const parsed = ix.parsed as
      | {
          type?: string;
          info?: {
            destination?: string;
            source?: string;
            lamports?: number;
          };
        }
      | undefined;
    if (
      program === "system" &&
      (parsed?.type === "transfer" || parsed?.type === "transferWithSeed") &&
      parsed.info?.destination === SOLANA_RECIPIENT_WALLET &&
      typeof parsed.info.lamports === "number" &&
      parsed.info.lamports > 0
    ) {
      instructionLamports += parsed.info.lamports;
      if (!instructionSender && typeof parsed.info.source === "string") {
        instructionSender = parsed.info.source;
      }
    }
  }

  const recipientIdx = accountKeys.findIndex((key) => key === SOLANA_RECIPIENT_WALLET);
  const preBalances = tx.meta?.preBalances ?? [];
  const postBalances = tx.meta?.postBalances ?? [];
  const balanceDelta =
    recipientIdx >= 0 &&
    typeof preBalances[recipientIdx] === "number" &&
    typeof postBalances[recipientIdx] === "number"
      ? postBalances[recipientIdx]! - preBalances[recipientIdx]!
      : 0;

  const receivedLamports = Math.max(instructionLamports, balanceDelta);

  if (!instructionSender) {
    // Identify the primary funding account whose balance decreased or the fee payer
    const rawKeys = tx.transaction?.message?.accountKeys ?? [];
    for (let i = 0; i < accountKeys.length; i++) {
      const candidate = accountKeys[i]!;
      if (!candidate || candidate === SOLANA_RECIPIENT_WALLET) continue;
      const pre = preBalances[i];
      const post = postBalances[i];
      const rawEntry = rawKeys[i];
      const isSigner =
        i === 0 || (typeof rawEntry === "object" && rawEntry !== null && rawEntry.signer === true);
      if (isSigner && typeof pre === "number" && typeof post === "number" && pre > post) {
        instructionSender = candidate;
        break;
      }
    }
    if (!instructionSender && accountKeys[0] && accountKeys[0] !== SOLANA_RECIPIENT_WALLET) {
      instructionSender = accountKeys[0];
    }
  }

  return { receivedLamports, senderWallet: instructionSender };
}

function findExistingContribution(txSignature: string) {
  const localRow = db
    .select()
    .from(solanaContributions)
    .where(eq(solanaContributions.txSignature, txSignature))
    .get();
  if (localRow) return localRow;
  return runWithDefaultDatabase(() =>
    db
      .select()
      .from(solanaContributions)
      .where(eq(solanaContributions.txSignature, txSignature))
      .get(),
  );
}

export async function verifySolanaTransactionOnChain(params: {
  txSignature: string;
  scopeKey?: string;
  walletSignature?: string;
  signedMessage?: string;
  rpcUrl?: string;
  fetchImpl?: typeof fetch;
  minLamports?: number;
}): Promise<VerifiedSolanaContribution> {
  const trimmedSig = (params.txSignature ?? "").trim();
  if (!isValidTransactionSignature(trimmedSig)) {
    throw new RequestError(
      "Invalid Solana transaction signature. Paste a valid 64-byte Base58 transaction signature.",
    );
  }

  const challenge = deriveContributionChallenge(params.scopeKey);
  const existing = findExistingContribution(trimmedSig);
  if (existing) {
    throw new RequestError(
      "This Solana transaction signature has already been verified and redeemed.",
    );
  }

  const rpcEndpoint =
    params.rpcUrl || process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const fetchFn = params.fetchImpl ?? fetch;

  let rpcPayload: { result?: RpcTransactionResult; error?: { message?: string } };
  try {
    const response = await fetchFn(rpcEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "tbj-verify-tx",
        method: "getTransaction",
        params: [
          trimmedSig,
          {
            encoding: "jsonParsed",
            commitment: "finalized",
            maxSupportedTransactionVersion: 0,
          },
        ],
      }),
    });
    if (!response.ok) {
      throw new RequestError(`Solana RPC returned HTTP ${response.status}. Try again shortly.`);
    }
    rpcPayload = (await response.json()) as {
      result?: RpcTransactionResult;
      error?: { message?: string };
    };
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError("Unable to reach Solana Mainnet RPC to verify transaction.");
  }

  if (rpcPayload.error) {
    throw new RequestError(
      `Solana RPC error: ${rpcPayload.error.message ?? "Unable to inspect transaction."}`,
    );
  }

  const tx = rpcPayload.result;
  if (!tx || !tx.meta) {
    throw new RequestError(
      "Transaction not found or not yet finalized on Solana Mainnet-Beta. Wait a few seconds for finality and retry.",
    );
  }

  if (tx.meta.err !== null && tx.meta.err !== undefined) {
    throw new RequestError("This Solana transaction failed on-chain and cannot be redeemed.");
  }

  const accountKeys = extractAccountKeyStrings(tx);
  if (!accountKeys.includes(SOLANA_RECIPIENT_WALLET)) {
    throw new RequestError(
      `Transaction does not transfer SOL to the official Trading Bauhaus wallet (${SOLANA_RECIPIENT_WALLET}).`,
    );
  }

  const { receivedLamports, senderWallet } = extractTransferToRecipient(tx, accountKeys);
  const requiredLamports = params.minLamports ?? configuredMinContributionLamports();

  if (receivedLamports < requiredLamports) {
    const receivedSol = (receivedLamports / LAMPORTS_PER_SOL).toFixed(4);
    const requiredSol = (requiredLamports / LAMPORTS_PER_SOL).toFixed(4);
    throw new RequestError(
      `Insufficient contribution amount: recipient received ${receivedSol} SOL, minimum required is ${requiredSol} SOL.`,
    );
  }

  if (!senderWallet || !isValidSolanaAddress(senderWallet)) {
    throw new RequestError("Could not determine a valid sender wallet from the transaction.");
  }

  // Anti-replay ownership check:
  // Path A: Transaction includes the instance-derived challengeMemo (`TBJ-<16-HEX>`) in SPL Memo or logs.
  const memos = extractMemosFromTransaction(tx);
  const hasMatchingMemo = memos.some((memo) => memo.includes(challenge.challengeMemo));

  let proofType: "memo" | "wallet_signature" = "memo";
  if (!hasMatchingMemo) {
    // Path B: User provides a detached Ed25519 signature from the exact `senderWallet` signing the challenge.
    const providedSig = (params.walletSignature ?? "").trim();
    if (!providedSig) {
      throw new RequestError(
        `Transaction does not include challenge memo "${challenge.challengeMemo}". To prevent public blockchain replay attacks, either include "${challenge.challengeMemo}" in the payment memo or sign the challenge with sender wallet ${senderWallet}.`,
      );
    }
    const candidateMessages = [
      challenge.signingMessage,
      `${challenge.signingMessage}\nTransaction: ${trimmedSig}`,
    ];
    if (
      typeof params.signedMessage === "string" &&
      params.signedMessage.includes(challenge.challengeMemo) &&
      params.signedMessage.includes(SOLANA_RECIPIENT_WALLET)
    ) {
      candidateMessages.push(params.signedMessage);
    }
    const signatureValid = candidateMessages.some((msg) =>
      verifySolanaWalletSignature({
        walletAddress: senderWallet,
        message: msg,
        signature: providedSig,
      }),
    );
    if (!signatureValid) {
      throw new RequestError(
        `Wallet signature verification failed. The challenge must be signed by sender wallet ${senderWallet}.`,
      );
    }
    proofType = "wallet_signature";
  }

  return {
    txSignature: trimmedSig,
    recipientWallet: SOLANA_RECIPIENT_WALLET,
    senderWallet,
    lamports: receivedLamports,
    slot: typeof tx.slot === "number" ? tx.slot : 0,
    blockTime: typeof tx.blockTime === "number" ? tx.blockTime : null,
    challengeMemo: challenge.challengeMemo,
    proofType,
    redeemedByScope: challenge.scopeKey,
    verifiedAt: new Date().toISOString(),
  };
}

function computeLicenseTokenHash(verified: {
  txSignature: string;
  recipientWallet: string;
  senderWallet: string;
  lamports: number;
  challengeMemo: string;
}): string {
  return hashPrivateIdentifier(
    "solana-contribution-license-v1",
    [
      verified.txSignature,
      verified.recipientWallet,
      verified.senderWallet,
      String(verified.lamports),
      verified.challengeMemo,
    ].join(":"),
  );
}

/**
 * Persists a verified Solana contribution in both the replay ledger (`solana_contributions`)
 * and the encrypted workspace settings (`solana_contribution_license`).
 */
export function recordVerifiedContribution(
  verified: VerifiedSolanaContribution,
): SolanaLicenseStatus {
  if (verified.recipientWallet !== SOLANA_RECIPIENT_WALLET) {
    throw new RequestError("Invalid recipient wallet in contribution record.");
  }
  const licenseTokenHash = computeLicenseTokenHash(verified);
  const envelope: EncryptedLicenseEnvelope = {
    version: 1,
    txSignature: verified.txSignature,
    recipientWallet: verified.recipientWallet,
    senderWallet: verified.senderWallet,
    lamports: verified.lamports,
    slot: verified.slot,
    blockTime: verified.blockTime,
    challengeMemo: verified.challengeMemo,
    proofType: verified.proofType,
    redeemedByScope: verified.redeemedByScope,
    licenseTokenHash,
    verifiedAt: verified.verifiedAt,
  };
  const encryptedValue = encryptJson(envelope);

  const rowValues = {
    txSignature: verified.txSignature,
    recipientWallet: verified.recipientWallet,
    senderWallet: verified.senderWallet,
    lamports: verified.lamports,
    slot: verified.slot,
    blockTime: verified.blockTime,
    challengeMemo: verified.challengeMemo,
    proofType: verified.proofType,
    redeemedByScope: verified.redeemedByScope,
    licenseTokenHash,
    createdAt: verified.verifiedAt,
  };

  db.insert(solanaContributions).values(rowValues).onConflictDoNothing().run();
  db.insert(settings)
    .values({ key: SOLANA_LICENSE_SETTING_KEY, value: encryptedValue })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: encryptedValue },
    })
    .run();

  // Mirror into the default owner database so the replay ledger is globally enforced
  runWithDefaultDatabase(() => {
    db.insert(solanaContributions).values(rowValues).onConflictDoNothing().run();
  });

  return {
    active: true,
    enforced: isSolanaContributionEnforced(),
    recipientWallet: SOLANA_RECIPIENT_WALLET,
    txSignature: verified.txSignature,
    senderWallet: verified.senderWallet,
    lamports: verified.lamports,
    solAmount: Number((verified.lamports / LAMPORTS_PER_SOL).toFixed(6)),
    proofType: verified.proofType,
    verifiedAt: verified.verifiedAt,
  };
}

/**
 * Inspects and cryptographically verifies the current workspace's Solana contribution license.
 * Tampering with the SQLite database directly without the server's secret key will fail
 * AES-256-GCM authentication and HMAC token verification.
 */
export function getWorkspaceLicenseStatus(): SolanaLicenseStatus {
  const emptyStatus: SolanaLicenseStatus = {
    active: false,
    enforced: isSolanaContributionEnforced(),
    recipientWallet: SOLANA_RECIPIENT_WALLET,
    txSignature: null,
    senderWallet: null,
    lamports: null,
    solAmount: null,
    proofType: null,
    verifiedAt: null,
  };

  try {
    const settingRow = db
      .select()
      .from(settings)
      .where(eq(settings.key, SOLANA_LICENSE_SETTING_KEY))
      .get();
    if (!settingRow?.value) return emptyStatus;

    const decrypted = decryptJson<EncryptedLicenseEnvelope>(settingRow.value);
    if (
      !decrypted ||
      decrypted.version !== 1 ||
      decrypted.recipientWallet !== SOLANA_RECIPIENT_WALLET ||
      !isValidTransactionSignature(decrypted.txSignature) ||
      !isValidSolanaAddress(decrypted.senderWallet) ||
      typeof decrypted.lamports !== "number" ||
      decrypted.lamports < configuredMinContributionLamports()
    ) {
      return emptyStatus;
    }

    const expectedHash = computeLicenseTokenHash(decrypted);
    if (decrypted.licenseTokenHash !== expectedHash) {
      return emptyStatus;
    }

    const ledgerRow = findExistingContribution(decrypted.txSignature);
    if (
      !ledgerRow ||
      ledgerRow.recipientWallet !== SOLANA_RECIPIENT_WALLET ||
      ledgerRow.licenseTokenHash !== expectedHash
    ) {
      return emptyStatus;
    }

    return {
      active: true,
      enforced: isSolanaContributionEnforced(),
      recipientWallet: SOLANA_RECIPIENT_WALLET,
      txSignature: decrypted.txSignature,
      senderWallet: decrypted.senderWallet,
      lamports: decrypted.lamports,
      solAmount: Number((decrypted.lamports / LAMPORTS_PER_SOL).toFixed(6)),
      proofType: decrypted.proofType,
      verifiedAt: decrypted.verifiedAt,
    };
  } catch {
    return emptyStatus;
  }
}

export function getSolanaContributionConfig(scopeKey?: string): SolanaContributionConfigPayload {
  const challenge = deriveContributionChallenge(scopeKey);
  const minContributionLamports = configuredMinContributionLamports();
  const minContributionSol = Number((minContributionLamports / LAMPORTS_PER_SOL).toFixed(4));
  const licenseStatus = getWorkspaceLicenseStatus();
  const solanaPayUri = buildSolanaPayUri({
    recipient: SOLANA_RECIPIENT_WALLET,
    amountSol: minContributionSol || DEFAULT_MIN_CONTRIBUTION_SOL,
    memo: challenge.challengeMemo,
    label: "Trading Bauhaus Journal",
    message: `Trading Bauhaus Contributor License (${challenge.challengeMemo})`,
  });

  return {
    recipientWallet: SOLANA_RECIPIENT_WALLET,
    minContributionSol,
    minContributionLamports,
    challengeMemo: challenge.challengeMemo,
    signingMessage: challenge.signingMessage,
    solanaPayUri,
    licenseStatus,
  };
}

export function requireSolanaContributionOrThrow(): SolanaLicenseStatus {
  const status = getWorkspaceLicenseStatus();
  if (status.enforced && !status.active) {
    throw new RequestError(
      `An active Solana contributor license to ${SOLANA_RECIPIENT_WALLET} is required to unlock this action.`,
    );
  }
  return status;
}
