import { db } from "@/db";
import { bad, handler, ok } from "@/server/api";
import { createInvitationStore } from "@/server/invitations/store";
import { multiUserEnabled, passwordConfigured } from "@/server/security/auth";

export const GET = handler(
  async (request: Request) => {
    if (!multiUserEnabled() || !passwordConfigured())
      return bad("Invitations are unavailable.", 404);
    const token = new URL(request.url).searchParams.get("token");
    const invitation = createInvitationStore(db.$client).validate(token);
    if (!invitation) return bad("Invitation is invalid or unavailable.", 400);
    return ok(invitation);
  },
  { public: true },
);
