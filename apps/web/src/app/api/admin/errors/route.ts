import { handler, ok, bad } from "@/server/api";
import { ownerAccess } from "@/server/security/owner";
import { supportActor } from "@/server/support/actor";
import { applicationErrorSummary } from "@/server/errors/runtime";

export const GET = handler(async () => {
  const actor = await supportActor();
  if (actor?.kind === "demo") return bad("Admin error activity is unavailable in demo mode.", 403);
  if (!(await ownerAccess())) return bad("Unauthorized", 401);
  return ok(await applicationErrorSummary());
});
