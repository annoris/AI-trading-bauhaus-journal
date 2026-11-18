import { trustedClientIp } from "./client-ip";
let lastWarning = 0;
export async function activityStore() {
  const [{ db }, { encryptJson, hashPrivateIdentifier }, { createActivityStore }] =
    await Promise.all([
      import("@/db"),
      import("@/server/crypto"),
      import("@/server/activity/store"),
    ]);
  return createActivityStore(db.$client, {
    seal: encryptJson,
    fingerprint: (ip) => hashPrivateIdentifier("activity-ip", ip),
  });
}
export async function recordRequestActivity(request: Request, actor: string, status: number) {
  const ip = trustedClientIp(request);
  if (!ip) return;
  const path = new URL(request.url).pathname;
  const event =
    path === "/api/auth"
      ? status < 400
        ? "login-success"
        : "login-failed"
      : status >= 400
        ? "request-denied"
        : ["POST", "PATCH", "PUT", "DELETE"].includes(request.method)
          ? "data-change"
          : path.startsWith("/api/export")
            ? "data-export"
            : null;
  if (!event) return;
  try {
    (await activityStore()).record(
      ip,
      path === "/api/auth" && status < 400 && actor === "anonymous" ? "authenticated" : actor,
      event,
      status,
    );
  } catch {
    if (Date.now() - lastWarning > 300000) {
      lastWarning = Date.now();
      console.warn("Security activity storage unavailable.");
    }
  }
}
const state = globalThis as typeof globalThis & {
  __activityPurge?: ReturnType<typeof setInterval>;
};
export async function startActivityRetention() {
  if (state.__activityPurge || !process.env.JOURNAL_PROXY_TOKEN) return;
  const sweep = async () => {
    try {
      (await activityStore()).purge();
    } catch {
      console.warn("Security activity retention cleanup failed.");
    }
  };
  await sweep();
  state.__activityPurge = setInterval(() => void sweep(), 3600000);
  state.__activityPurge.unref();
}
