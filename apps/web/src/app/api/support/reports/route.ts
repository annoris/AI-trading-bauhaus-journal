import { db, runWithDefaultDatabase } from "@/db";
import { handler, ok, bad } from "@/server/api";
import { supportActor } from "@/server/support/actor";
import { createSupportStore, SupportError } from "@/server/support/store";
import { readSmallJson } from "@/server/security/request";

export const GET = handler(async () => {
  const actor = await supportActor();
  if (!actor) return bad("Sign in to view support reports.", 401);
  if (actor.kind === "demo") return bad("Support is unavailable in demo mode.", 403);
  const reports = runWithDefaultDatabase(() =>
    createSupportStore(db.$client).listForReporter(actor.id),
  );
  return ok({ reports });
});

export const POST = handler(async (request: Request) => {
  const actor = await supportActor();
  if (!actor) return bad("Sign in to submit a support report.", 401);
  if (actor.kind === "demo") return bad("Support is unavailable in demo mode.", 403);
  let body: {
    category?: unknown;
    subject?: unknown;
    description?: unknown;
    route?: unknown;
    errorId?: unknown;
  };
  try {
    body = (await readSmallJson(request)) as typeof body;
  } catch (cause) {
    if (cause instanceof Error && cause.message === "REQUEST_TOO_LARGE")
      return bad("Report is too large.", 413);
    return bad("Invalid support report.", 400);
  }
  try {
    const report = runWithDefaultDatabase(() =>
      createSupportStore(db.$client).create({
        reporterId: actor.id,
        reporterEmail: actor.email,
        category: body.category,
        subject: body.subject,
        description: body.description,
        route: body.route,
        errorId: body.errorId,
      }),
    );
    return ok({ report }, { status: 201 });
  } catch (cause) {
    if (cause instanceof SupportError) return bad(cause.message, cause.status);
    throw cause;
  }
});
