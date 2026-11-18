import { db } from "@/db";
import { readSmallJson } from "@/server/security/request";
import { ownerAccess } from "@/server/security/owner";
import { handler, ok, bad } from "@/server/api";
import { createInvitationStore, InvitationError } from "@/server/invitations/store";
import { multiUserEnabled } from "@/server/security/auth";

// Invitation links are private owner actions. Each accepted member gets an isolated journal DB.
function store() {
  return createInvitationStore(db.$client);
}
export const GET = handler(async () => {
  if (!multiUserEnabled()) return bad("Invitations are unavailable.", 404);
  if (!(await ownerAccess())) return bad("Unauthorized", 401);
  return ok({ invitations: store().list() });
});
export const POST = handler(async (request: Request) => {
  if (!multiUserEnabled()) return bad("Invitations are unavailable.", 404);
  if (!(await ownerAccess())) return bad("Unauthorized", 401);
  try {
    let body: { email?: unknown; ttlHours?: number };
    try {
      body = (await readSmallJson(request)) as typeof body;
    } catch (error) {
      if (error instanceof Error && error.message === "REQUEST_TOO_LARGE")
        return bad("Request too large", 413);
      return bad("Invalid request", 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return bad("Invalid request", 400);
    return ok(store().create(body.email, body.ttlHours), { status: 201 });
  } catch (error) {
    if (error instanceof InvitationError) return bad(error.message, error.status);
    throw error;
  }
});
export const DELETE = handler(async (request: Request) => {
  if (!multiUserEnabled()) return bad("Invitations are unavailable.", 404);
  if (!(await ownerAccess())) return bad("Unauthorized", 401);
  const id = new URL(request.url).searchParams.get("id") ?? "";
  try {
    return ok({ revoked: store().revoke(id) });
  } catch (error) {
    if (error instanceof InvitationError) return bad(error.message, error.status);
    throw error;
  }
});
