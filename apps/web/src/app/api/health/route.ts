import { db } from "@/db";
import { handler, ok } from "@/server/api";

/** Minimal readiness check: reveal only whether the configured journal DB answers a trivial query. */
export const GET = handler(
  () => {
    db.$client.prepare("SELECT 1 AS ready").get();
    return ok({ status: "ok" });
  },
  { public: true },
);
