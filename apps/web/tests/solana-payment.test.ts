import { generateKeyPairSync, randomBytes, sign as cryptoSign } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
  }),
}));

import {
  buildSolanaPayUri,
  decodeBase58,
  DEFAULT_MIN_CONTRIBUTION_LAMPORTS,
  encodeBase58,
  isValidSolanaAddress,
  isValidTransactionSignature,
  SOLANA_RECIPIENT_WALLET,
  SPL_MEMO_PROGRAM_ID,
} from "../src/lib/solana-payment";
import {
  deriveContributionChallenge,
  getWorkspaceLicenseStatus,
  recordVerifiedContribution,
  SOLANA_LICENSE_SETTING_KEY,
  verifySolanaTransactionOnChain,
  verifySolanaWalletSignature,
} from "../src/server/solana-verifier";
import { db, settings } from "../src/db";

function generateTestSolanaKeypair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const spkiDer = publicKey.export({ format: "der", type: "spki" });
  // Last 32 bytes of RFC 8410 Ed25519 SPKI DER are the raw 32-byte public key
  const rawPubkey = new Uint8Array(spkiDer.subarray(spkiDer.length - 32));
  const address = encodeBase58(rawPubkey);
  return {
    address,
    signMessage(message: string): string {
      const sig = cryptoSign(null, Buffer.from(message, "utf8"), privateKey);
      return encodeBase58(new Uint8Array(sig));
    },
  };
}

function makeFakeSignature(): string {
  return encodeBase58(new Uint8Array(randomBytes(64)));
}

describe("Solana payment & anti-tamper contribution verification", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "tbj-solana-test-"));
    vi.stubEnv("JOURNAL_DATA_DIR", tempDir);
    vi.stubEnv("JOURNAL_SECRET", "test-solana-secret-key-for-hmac-and-aes");
    const globalForDb = globalThis as typeof globalThis & {
      __journalDb?: unknown;
      __journalUserDbs?: Map<string, unknown>;
      __journalPublicDemoDb?: unknown;
    };
    delete globalForDb.__journalDb;
    globalForDb.__journalUserDbs?.clear();
    delete globalForDb.__journalPublicDemoDb;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup error
    }
  });

  it("validates official recipient wallet 3HvUMCUSSHEdtA35UuD4J7mbgpTxJ7LgT2X7GfdzvBdm and Base58 primitives", () => {
    expect(SOLANA_RECIPIENT_WALLET).toBe("3HvUMCUSSHEdtA35UuD4J7mbgpTxJ7LgT2X7GfdzvBdm");
    expect(isValidSolanaAddress(SOLANA_RECIPIENT_WALLET)).toBe(true);
    const decoded = decodeBase58(SOLANA_RECIPIENT_WALLET);
    expect(decoded.length).toBe(32);
    expect(encodeBase58(decoded)).toBe(SOLANA_RECIPIENT_WALLET);

    expect(isValidSolanaAddress("invalid-address")).toBe(false);
    const sig = makeFakeSignature();
    expect(isValidTransactionSignature(sig)).toBe(true);
    expect(isValidTransactionSignature(SOLANA_RECIPIENT_WALLET)).toBe(false);

    const uri = buildSolanaPayUri({
      amountSol: 0.1,
      memo: "TBJ-1234567890ABCDEF",
      label: "Trading Bauhaus",
    });
    expect(uri).toContain(`solana:${SOLANA_RECIPIENT_WALLET}?`);
    expect(uri).toContain("amount=0.1");
    expect(uri).toContain("memo=TBJ-1234567890ABCDEF");
  });

  it("verifies detached Ed25519 Solana wallet signatures using node:crypto", () => {
    const wallet = generateTestSolanaKeypair();
    const otherWallet = generateTestSolanaKeypair();
    const challenge = deriveContributionChallenge("owner");

    expect(challenge.challengeMemo).toMatch(/^TBJ-[A-F0-9]{16}$/);
    const signature = wallet.signMessage(challenge.signingMessage);

    expect(
      verifySolanaWalletSignature({
        walletAddress: wallet.address,
        message: challenge.signingMessage,
        signature,
      }),
    ).toBe(true);

    // Rejects signature from wrong wallet or altered message
    expect(
      verifySolanaWalletSignature({
        walletAddress: otherWallet.address,
        message: challenge.signingMessage,
        signature,
      }),
    ).toBe(false);
    expect(
      verifySolanaWalletSignature({
        walletAddress: wallet.address,
        message: challenge.signingMessage + "tampered",
        signature,
      }),
    ).toBe(false);
  });

  it("verifies an on-chain Solana contribution with challenge memo, persists encrypted license, and blocks replay", async () => {
    const sender = generateTestSolanaKeypair();
    const txSignature = makeFakeSignature();
    const challenge = deriveContributionChallenge("owner");

    const mockFetch = (async () =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "tbj-verify-tx",
          result: {
            slot: 310_000_000,
            blockTime: 1_730_000_000,
            meta: {
              err: null,
              preBalances: [500_000_000, 1_000_000],
              postBalances: [399_995_000, 101_000_000],
              logMessages: [`Program log: Memo (len 20): "${challenge.challengeMemo}"`],
            },
            transaction: {
              message: {
                accountKeys: [
                  { pubkey: sender.address, signer: true },
                  { pubkey: SOLANA_RECIPIENT_WALLET, signer: false },
                ],
                instructions: [
                  {
                    program: "system",
                    parsed: {
                      type: "transfer",
                      info: {
                        source: sender.address,
                        destination: SOLANA_RECIPIENT_WALLET,
                        lamports: DEFAULT_MIN_CONTRIBUTION_LAMPORTS,
                      },
                    },
                  },
                  {
                    program: "spl-memo",
                    programId: SPL_MEMO_PROGRAM_ID,
                    parsed: challenge.challengeMemo,
                  },
                ],
              },
            },
          },
        }),
        { status: 200 },
      )) as unknown as typeof fetch;

    const verified = await verifySolanaTransactionOnChain({
      txSignature,
      scopeKey: "owner",
      fetchImpl: mockFetch,
    });

    expect(verified.recipientWallet).toBe(SOLANA_RECIPIENT_WALLET);
    expect(verified.senderWallet).toBe(sender.address);
    expect(verified.lamports).toBe(DEFAULT_MIN_CONTRIBUTION_LAMPORTS);
    expect(verified.proofType).toBe("memo");

    const status = recordVerifiedContribution(verified);
    expect(status.active).toBe(true);
    expect(status.txSignature).toBe(txSignature);
    expect(getWorkspaceLicenseStatus().active).toBe(true);

    // Attempting to replay the exact same transaction signature must fail
    await expect(
      verifySolanaTransactionOnChain({
        txSignature,
        scopeKey: "another-user",
        fetchImpl: mockFetch,
      }),
    ).rejects.toThrow(/already been verified and redeemed/i);

    // Tampering with the SQLite settings table invalidates the license
    db.update(settings)
      .set({ value: "tampered.invalid.envelope" })
      .where(eq(settings.key, SOLANA_LICENSE_SETTING_KEY))
      .run();
    expect(getWorkspaceLicenseStatus().active).toBe(false);
  });

  it("rejects public Solscan transaction replay without memo unless sender wallet signs the challenge", async () => {
    const sender = generateTestSolanaKeypair();
    const attacker = generateTestSolanaKeypair();
    const txSignature = makeFakeSignature();
    const challenge = deriveContributionChallenge("owner");

    const mockFetchNoMemo = (async () =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "tbj-verify-tx",
          result: {
            slot: 310_000_123,
            blockTime: 1_730_000_123,
            meta: {
              err: null,
              preBalances: [500_000_000, 0],
              postBalances: [399_995_000, 100_000_000],
              logMessages: [],
            },
            transaction: {
              message: {
                accountKeys: [
                  { pubkey: sender.address, signer: true },
                  { pubkey: SOLANA_RECIPIENT_WALLET, signer: false },
                ],
                instructions: [
                  {
                    program: "system",
                    parsed: {
                      type: "transfer",
                      info: {
                        source: sender.address,
                        destination: SOLANA_RECIPIENT_WALLET,
                        lamports: DEFAULT_MIN_CONTRIBUTION_LAMPORTS,
                      },
                    },
                  },
                ],
              },
            },
          },
        }),
        { status: 200 },
      )) as unknown as typeof fetch;

    // 1. Fails when submitted without memo or wallet signature
    await expect(
      verifySolanaTransactionOnChain({
        txSignature,
        scopeKey: "owner",
        fetchImpl: mockFetchNoMemo,
      }),
    ).rejects.toThrow(/does not include challenge memo/i);

    // 2. Fails when signed by a different wallet (attacker trying to claim sender's tx)
    await expect(
      verifySolanaTransactionOnChain({
        txSignature,
        scopeKey: "owner",
        walletSignature: attacker.signMessage(challenge.signingMessage),
        fetchImpl: mockFetchNoMemo,
      }),
    ).rejects.toThrow(/Wallet signature verification failed/i);

    // 3. Succeeds when signed by the true sender wallet
    const verified = await verifySolanaTransactionOnChain({
      txSignature,
      scopeKey: "owner",
      walletSignature: sender.signMessage(challenge.signingMessage),
      fetchImpl: mockFetchNoMemo,
    });
    expect(verified.proofType).toBe("wallet_signature");
    expect(verified.senderWallet).toBe(sender.address);
  });

  it("rejects underpayment and wrong recipient wallet transfers", async () => {
    const sender = generateTestSolanaKeypair();
    const wrongRecipient = generateTestSolanaKeypair();
    const challenge = deriveContributionChallenge("owner");

    // Wrong recipient wallet
    const mockWrongRecipientFetch = (async () =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "tbj-verify-tx",
          result: {
            slot: 310_000_500,
            blockTime: 1_730_000_500,
            meta: {
              err: null,
              preBalances: [500_000_000, 0],
              postBalances: [399_995_000, 100_000_000],
              logMessages: [`Program log: Memo: "${challenge.challengeMemo}"`],
            },
            transaction: {
              message: {
                accountKeys: [
                  { pubkey: sender.address, signer: true },
                  { pubkey: wrongRecipient.address, signer: false },
                ],
                instructions: [
                  {
                    program: "system",
                    parsed: {
                      type: "transfer",
                      info: {
                        source: sender.address,
                        destination: wrongRecipient.address,
                        lamports: DEFAULT_MIN_CONTRIBUTION_LAMPORTS,
                      },
                    },
                  },
                ],
              },
            },
          },
        }),
        { status: 200 },
      )) as unknown as typeof fetch;

    await expect(
      verifySolanaTransactionOnChain({
        txSignature: makeFakeSignature(),
        scopeKey: "owner",
        fetchImpl: mockWrongRecipientFetch,
      }),
    ).rejects.toThrow(/does not transfer SOL to the official Trading Bauhaus wallet/i);

    // Underpayment (e.g. 1,000 lamports instead of DEFAULT_MIN_CONTRIBUTION_LAMPORTS)
    const mockUnderpaymentFetch = (async () =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "tbj-verify-tx",
          result: {
            slot: 310_000_501,
            blockTime: 1_730_000_501,
            meta: {
              err: null,
              preBalances: [500_000_000, 0],
              postBalances: [499_994_000, 1_000],
              logMessages: [`Program log: Memo: "${challenge.challengeMemo}"`],
            },
            transaction: {
              message: {
                accountKeys: [
                  { pubkey: sender.address, signer: true },
                  { pubkey: SOLANA_RECIPIENT_WALLET, signer: false },
                ],
                instructions: [
                  {
                    program: "system",
                    parsed: {
                      type: "transfer",
                      info: {
                        source: sender.address,
                        destination: SOLANA_RECIPIENT_WALLET,
                        lamports: 1_000,
                      },
                    },
                  },
                ],
              },
            },
          },
        }),
        { status: 200 },
      )) as unknown as typeof fetch;

    await expect(
      verifySolanaTransactionOnChain({
        txSignature: makeFakeSignature(),
        scopeKey: "owner",
        fetchImpl: mockUnderpaymentFetch,
      }),
    ).rejects.toThrow(/Insufficient contribution amount/i);
  });

  it("mints a valid one-time contributor invitation upon verified Solana payment via API route", async () => {
    const sender = generateTestSolanaKeypair();
    const txSignature = makeFakeSignature();
    const challenge = deriveContributionChallenge("owner");

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "tbj-verify-tx",
          result: {
            slot: 310_000_999,
            blockTime: 1_730_000_999,
            meta: {
              err: null,
              preBalances: [500_000_000, 0],
              postBalances: [399_995_000, DEFAULT_MIN_CONTRIBUTION_LAMPORTS],
              logMessages: [`Program log: Memo: "${challenge.challengeMemo}"`],
            },
            transaction: {
              message: {
                accountKeys: [
                  { pubkey: sender.address, signer: true },
                  { pubkey: SOLANA_RECIPIENT_WALLET, signer: false },
                ],
                instructions: [
                  {
                    program: "system",
                    parsed: {
                      type: "transfer",
                      info: {
                        source: sender.address,
                        destination: SOLANA_RECIPIENT_WALLET,
                        lamports: DEFAULT_MIN_CONTRIBUTION_LAMPORTS,
                      },
                    },
                  },
                ],
              },
            },
          },
        }),
        { status: 200 },
      )) as unknown as typeof fetch;

    try {
      const { POST } = await import("../src/app/api/solana/contribution/route");
      const req = new Request("http://localhost:3000/api/solana/contribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txSignature,
          issueInvitation: true,
          email: "contributor@tradingbauhaus.com",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const payload = (await res.json()) as {
        verified: boolean;
        licenseStatus: { active: boolean; recipientWallet: string };
        invitation: { token: string; email: string; acceptUrl: string } | null;
      };
      expect(payload.verified).toBe(true);
      expect(payload.licenseStatus.active).toBe(true);
      expect(payload.licenseStatus.recipientWallet).toBe(SOLANA_RECIPIENT_WALLET);
      expect(payload.invitation).not.toBeNull();
      expect(payload.invitation?.email).toBe("contributor@tradingbauhaus.com");
      expect(payload.invitation?.token).toMatch(/^[A-Za-z0-9_-]{32,}$/);
      expect(payload.invitation?.acceptUrl).toContain("/accept-invitation?token=");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
