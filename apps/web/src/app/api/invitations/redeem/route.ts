import { cookies } from "next/headers";
import { db } from "@/db";
import { readSmallJson } from "@/server/security/request";
import { handler, ok, bad } from "@/server/api";
import { AccessError, createUserAccessStore } from "@/server/users/access";
import { createInvitationStore, InvitationError } from "@/server/invitations/store";
import {
  USER_AUTH_COOKIE,
  USER_SESSION_MAX_AGE,
  multiUserEnabled,
  passwordConfigured,
} from "@/server/security/auth";

export const POST = handler(
  async (request: Request) => {
    if (!multiUserEnabled() || !passwordConfigured())
      return bad("Invitations are unavailable.", 404);
    let body: { token?: unknown; password?: unknown };
    try {
      body = (await readSmallJson(request)) as typeof body;
    } catch (error) {
      if (error instanceof Error && error.message === "REQUEST_TOO_LARGE")
        return bad("Request too large", 413);
      return bad("Invalid request", 400);
    }
    if (
      !body ||
      typeof body.token !== "string" ||
      typeof body.password !== "string" ||
      body.password.length < 12 ||
      body.password.length > 1024
    )
      return bad("Use a password with at least 12 characters.");

    const invites = createInvitationStore(db.$client);
    const invitation = invites.validate(body.token);
    if (!invitation) return bad("Invitation is invalid or unavailable.", 400);
    try {
      const access = createUserAccessStore(db.$client);
      const result = invites.consume(body.token, invitation.email, () => {
        const user = access.provisionInvitedUser(invitation.email, body.password as string);
        return { user, token: access.issueSession(user.id) };
      });
      const jar = await cookies();
      jar.delete("journal_session");
      jar.set(USER_AUTH_COOKIE, result.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: new URL(process.env.JOURNAL_PUBLIC_ORIGIN || request.url).protocol === "https:",
        path: "/",
        maxAge: USER_SESSION_MAX_AGE,
      });
      return ok({ authenticated: true, email: result.user.email }, { status: 201 });
    } catch (error) {
      if (error instanceof InvitationError || error instanceof AccessError)
        return bad(error.message, error.status);
      if (
        error instanceof Error &&
        /UNIQUE constraint failed: application_users.email/.test(error.message)
      )
        return bad("An account already exists for this invitation email.", 409);
      throw error;
    }
  },
  { public: true },
);
