import { db, runWithDefaultDatabase } from "@/db";
import { handler, ok, bad } from "@/server/api";
import { ownerAccess } from "@/server/security/owner";
import { supportActor } from "@/server/support/actor";
import { createSupportStore, SupportError } from "@/server/support/store";
import { readSmallJson } from "@/server/security/request";

export const GET = handler(async () => {
  const actor = await supportActor();
  if (actor?.kind === "demo") return bad("Admin support is unavailable in demo mode.", 403);
  if (!(await ownerAccess())) return bad("Unauthorized", 401);
  const reports = runWithDefaultDatabase(() => createSupportStore(db.$client).listAll());
  return ok({ reports });
});

export const PATCH = handler(async (request: Request) => {
  const actor = await supportActor();
  if (actor?.kind === "demo") return bad("Admin support is unavailable in demo mode.", 403);
  if (!(await ownerAccess())) return bad("Unauthorized", 401);
  let body: { id?: unknown; status?: unknown; ownerReply?: unknown };
  try {
    body = (await readSmallJson(request)) as typeof body;
  } catch (cause) {
    if (cause instanceof Error && cause.message === "REQUEST_TOO_LARGE")
      return bad("Request is too large.", 413);
    return bad("Invalid support update.", 400);
  }
  if (!body || typeof body.id !== "string") return bad("Invalid support update.", 400);
  const id = body.id;
  try {
    const report = runWithDefaultDatabase(() =>
      createSupportStore(db.$client).update(id, body.status, body.ownerReply),
    );
    return ok({ report });
  } catch (cause) {
    if (cause instanceof SupportError) return bad(cause.message, cause.status);
    throw cause;
  }
});
