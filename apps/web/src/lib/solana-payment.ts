/**
 * Shared Solana payment & contribution primitives (client + server safe).
 * Do not import from `@/server/*` or `@/db/*` in this module so security boundary
 * checks pass when imported from `"use client"` components.
 */

export const SOLANA_RECIPIENT_WALLET = "3HvUMCUSSHEdtA35UuD4J7mbgpTxJ7LgT2X7GfdzvBdm";

export const LAMPORTS_PER_SOL = 1_000_000_000;
export const DEFAULT_MIN_CONTRIBUTION_SOL = 0.1;
export const DEFAULT_MIN_CONTRIBUTION_LAMPORTS = 100_000_000;

export const SPL_MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
export const SPL_MEMO_V1_PROGRAM_ID = "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo";

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE58_MAP = new Int16Array(128).fill(-1);
for (let i = 0; i < BASE58_ALPHABET.length; i++) {
  BASE58_MAP[BASE58_ALPHABET.charCodeAt(i)] = i;
}

/**
 * Pure Base58 decoder (Bitcoin/Solana alphabet).
 * Throws an Error if the string contains non-Base58 characters.
 */
export function decodeBase58(input: string): Uint8Array {
  const trimmed = input.trim();
  if (trimmed.length === 0) return new Uint8Array(0);

  let zeros = 0;
  while (zeros < trimmed.length && trimmed[zeros] === "1") {
    zeros++;
  }

  const size = Math.floor(((trimmed.length - zeros) * 733) / 1000) + 1;
  const b256 = new Uint8Array(size);
  let length = 0;

  for (let i = zeros; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    const carryInit = code < 128 ? BASE58_MAP[code]! : -1;
    if (carryInit < 0) {
      throw new Error(`Invalid Base58 character "${trimmed[i]}" at index ${i}`);
    }
    let carry = carryInit;
    let j = 0;
    for (let it = size - 1; (carry !== 0 || j < length) && it >= 0; it--, j++) {
      carry += 58 * b256[it]!;
      b256[it] = carry % 256;
      carry = Math.floor(carry / 256);
    }
    length = j;
  }

  let it = size - length;
  while (it < size && b256[it] === 0) {
    it++;
  }

  const out = new Uint8Array(zeros + (size - it));
  out.fill(0, 0, zeros);
  let idx = zeros;
  while (it < size) {
    out[idx++] = b256[it++]!;
  }
  return out;
}

/**
 * Pure Base58 encoder (Bitcoin/Solana alphabet).
 */
export function encodeBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";

  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) {
    zeros++;
  }

  const size = Math.floor(((bytes.length - zeros) * 138) / 100) + 1;
  const b58 = new Uint8Array(size);
  let length = 0;

  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i]!;
    let j = 0;
    for (let it = size - 1; (carry !== 0 || j < length) && it >= 0; it--, j++) {
      carry += 256 * b58[it]!;
      b58[it] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    length = j;
  }

  let it = size - length;
  while (it < size && b58[it] === 0) {
    it++;
  }

  let result = "1".repeat(zeros);
  for (; it < size; it++) {
    result += BASE58_ALPHABET[b58[it]!];
  }
  return result;
}

/**
 * Validates that an address is a canonical 32-byte Base58-encoded Solana public key.
 */
export function isValidSolanaAddress(address: string): boolean {
  if (typeof address !== "string") return false;
  const trimmed = address.trim();
  if (trimmed.length < 32 || trimmed.length > 44) return false;
  try {
    return decodeBase58(trimmed).length === 32;
  } catch {
    return false;
  }
}

/**
 * Validates that a signature is a canonical 64-byte Base58-encoded Ed25519 signature.
 */
export function isValidTransactionSignature(signature: string): boolean {
  if (typeof signature !== "string") return false;
  const trimmed = signature.trim();
  if (trimmed.length < 80 || trimmed.length > 90) return false;
  try {
    return decodeBase58(trimmed).length === 64;
  } catch {
    return false;
  }
}

/**
 * Builds a Solana Pay specification URI (`solana:<recipient>?amount=...&memo=...`).
 */
export function buildSolanaPayUri(params?: {
  recipient?: string;
  amountSol?: number;
  memo?: string;
  label?: string;
  message?: string;
}): string {
  const recipient = params?.recipient ?? SOLANA_RECIPIENT_WALLET;
  const query = new URLSearchParams();
  if (
    typeof params?.amountSol === "number" &&
    Number.isFinite(params.amountSol) &&
    params.amountSol > 0
  ) {
    query.set("amount", String(params.amountSol));
  }
  if (params?.label) {
    query.set("label", params.label);
  }
  if (params?.message) {
    query.set("message", params.message);
  }
  if (params?.memo) {
    query.set("memo", params.memo);
  }
  const qs = query.toString();
  return qs ? `solana:${recipient}?${qs}` : `solana:${recipient}`;
}

export function formatSolanaExplorerUrl(signature: string): string {
  return `https://solscan.io/tx/${encodeURIComponent(signature.trim())}`;
}

export function shortenSolanaIdentifier(value: string, chars = 6): string {
  const trimmed = value.trim();
  if (trimmed.length <= chars * 2 + 3) return trimmed;
  return `${trimmed.slice(0, chars)}...${trimmed.slice(-chars)}`;
}

export type SolanaLicenseStatus = {
  active: boolean;
  enforced: boolean;
  recipientWallet: string;
  txSignature: string | null;
  senderWallet: string | null;
  lamports: number | null;
  solAmount: number | null;
  proofType: "memo" | "wallet_signature" | null;
  verifiedAt: string | null;
};

export type SolanaContributionConfigPayload = {
  recipientWallet: string;
  minContributionSol: number;
  minContributionLamports: number;
  challengeMemo: string;
  signingMessage: string;
  solanaPayUri: string;
  licenseStatus: SolanaLicenseStatus;
};
