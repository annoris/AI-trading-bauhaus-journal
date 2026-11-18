import { handler, ok, bad } from "@/server/api";
import { ownerAccess } from "@/server/security/owner";
import { activityStore } from "@/server/security/activity-runtime";
export const GET = handler(async () => {
  if (!(await ownerAccess())) return bad("Unauthorized", 401);
  return ok({
    ipCaptureConfigured: (process.env.JOURNAL_PROXY_TOKEN?.length ?? 0) >= 32,
    ...(await activityStore()).summary(),
  });
});
