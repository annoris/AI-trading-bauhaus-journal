import { cookies } from "next/headers";
import { db, runWithDefaultDatabase, runWithUserDatabase } from "@/db";
import { bad, handler, ok, RequestError } from "@/server/api";
import {
  AUTH_COOKIE,
  USER_AUTH_COOKIE,
  multiUserEnabled,
  passwordConfigured,
  verifySession,
} from "@/server/security/auth";
import { createUserAccessStore } from "@/server/users/access";
import { createInvitationStore, InvitationError } from "@/server/invitations/store";
import {
  getSolanaContributionConfig,
  recordVerifiedContribution,
  verifySolanaTransactionOnChain,
} from "@/server/solana-verifier";

async function resolveCallerContext(explicitScope?: string | null): Promise<{
  userId: string | null;
  scopeKey: string;
}> {
  const jar = await cookies();
  if (passwordConfigured() && verifySession(jar.get(AUTH_COOKIE)?.value)) {
    return { userId: null, scopeKey: explicitScope?.trim() || "owner" };
  }
  if (multiUserEnabled()) {
    const user = runWithDefaultDatabase(() =>
      createUserAccessStore(db.$client).authenticate(jar.get(USER_AUTH_COOKIE)?.value),
    );
    if (user) {
      return { userId: user.id, scopeKey: `user:${user.id}` };
    }
  }
  return {
    userId: null,
    scopeKey: explicitScope?.trim() ? `public:${explicitScope.trim().toLowerCase()}` : "owner",
  };
}

export const GET = handler(
  async (request: Request) => {
    const url = new URL(request.url);
    const scopeParam = url.searchParams.get("scope");
    const ctx = await resolveCallerContext(scopeParam);
    const config = ctx.userId
      ? runWithUserDatabase(ctx.userId, () => getSolanaContributionConfig(ctx.scopeKey))
      : getSolanaContributionConfig(ctx.scopeKey);
    return ok(config);
  },
  { public: true },
);

export const POST = handler(
  async (request: Request) => {
    let body: {
      txSignature?: unknown;
      walletSignature?: unknown;
      signedMessage?: unknown;
      email?: unknown;
      scope?: unknown;
      issueInvitation?: unknown;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return bad("Invalid JSON body.", 400);
    }

    const txSignature = typeof body.txSignature === "string" ? body.txSignature.trim() : "";
    if (!txSignature) {
      return bad("Transaction signature is required.", 400);
    }

    const walletSignature =
      typeof body.walletSignature === "string" ? body.walletSignature.trim() : undefined;
    const signedMessage = typeof body.signedMessage === "string" ? body.signedMessage : undefined;
    const scopeInput =
      typeof body.scope === "string" && body.scope.trim() ? body.scope.trim() : null;

    const ctx = await resolveCallerContext(scopeInput);

    // Verify on-chain against the caller's scope challenge (or default "owner" challenge if initiated from public landing)
    let verified;
    try {
      verified = ctx.userId
        ? await runWithUserDatabase(ctx.userId, () =>
            verifySolanaTransactionOnChain({
              txSignature,
              scopeKey: ctx.scopeKey,
              walletSignature,
              signedMessage,
            }),
          )
        : await verifySolanaTransactionOnChain({
            txSignature,
            scopeKey: ctx.scopeKey,
            walletSignature,
            signedMessage,
          });
    } catch (firstError) {
      if (ctx.scopeKey !== "owner" && !ctx.userId) {
        verified = await verifySolanaTransactionOnChain({
          txSignature,
          scopeKey: "owner",
          walletSignature,
          signedMessage,
        });
      } else {
        throw firstError;
      }
    }

    const licenseStatus = ctx.userId
      ? runWithUserDatabase(ctx.userId, () => recordVerifiedContribution(verified))
      : recordVerifiedContribution(verified);

    let invitation: {
      token: string;
      email: string;
      expiresAt: number;
      acceptUrl: string;
    } | null = null;

    if (body.issueInvitation === true) {
      const emailInput = typeof body.email === "string" ? body.email.trim() : "";
      if (!emailInput) {
        throw new RequestError("Enter an email address to mint your contributor invitation link.");
      }
      try {
        const created = runWithDefaultDatabase(() =>
          createInvitationStore(db.$client).create(emailInput),
        );
        invitation = {
          token: created.token,
          email: created.email,
          expiresAt: created.expiresAt,
          acceptUrl: `/accept-invitation?token=${encodeURIComponent(created.token)}`,
        };
      } catch (err) {
        if (err instanceof InvitationError) {
          throw new RequestError(err.message);
        }
        throw err;
      }
    }

    return ok({
      verified: true,
      licenseStatus,
      contribution: verified,
      invitation,
    });
  },
  { public: true },
);
