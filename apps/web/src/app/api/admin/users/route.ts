import { db } from "@/db";
import { handler, ok, bad } from "@/server/api";
import { readSmallJson } from "@/server/security/request";
import { ownerAccess } from "@/server/security/owner";
import { AccessError, createUserAccessStore } from "@/server/users/access";
export const GET = handler(async () => {
  if (!(await ownerAccess())) return bad("Unauthorized", 401);
  return ok({ users: createUserAccessStore(db.$client).list() });
});
export const PATCH = handler(async (request: Request) => {
  if (!(await ownerAccess())) return bad("Unauthorized", 401);
  let body: { id?: unknown; action?: unknown };
  try {
    body = (await readSmallJson(request)) as typeof body;
  } catch (error) {
    if (error instanceof Error && error.message === "REQUEST_TOO_LARGE")
      return bad("Request too large", 413);
    return bad("Invalid request", 400);
  }
  if (
    !body ||
    typeof body.id !== "string" ||
    !["suspend", "reactivate", "revoke-sessions"].includes(String(body.action))
  )
    return bad("Invalid access request", 400);
  try {
    return ok(
      createUserAccessStore(db.$client).manage(
        body.id,
        body.action as "suspend" | "reactivate" | "revoke-sessions",
        "local-owner",
      ),
    );
  } catch (error) {
    if (error instanceof AccessError) return bad(error.message, error.status);
    throw error;
  }
});
