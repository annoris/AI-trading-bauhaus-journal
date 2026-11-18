import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hostedConfigurationValid } from "./deployment";
import { trustedClientIp } from "./client-ip";
import { recordRequestActivity } from "./activity-runtime";
import { isTrustedWrite } from "./request";
import { createUserAccessStore } from "@/server/users/access";
import { runWithSeededDemoDatabase } from "@/server/demo-runtime";
import { runWithDefaultDatabase, runWithUserDatabase, db } from "@/db";
import { recordApplicationError } from "@/server/errors/runtime";
import {
  AUTH_COOKIE,
  USER_AUTH_COOKIE,
  multiUserEnabled,
  passwordConfigured,
  verifySession,
} from "./auth";

const DEMO_COOKIE = "journal_demo_mode";
const DEMO_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function hasDemoMarker(request: Request): boolean {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .some((part) => {
        const separator = part.indexOf("=");
        return (
          separator >= 0 &&
          part.slice(0, separator).trim() === DEMO_COOKIE &&
          part.slice(separator + 1).trim() === "1"
        );
      }) ?? false
  );
}

export class RequestError extends Error {}
export function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new RequestError(message);
}

export const ok = (data: unknown, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "private, no-store");
  return NextResponse.json(data, { ...init, headers });
};

export const bad = (message: string, status = 400) =>
  NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );

/** Route-handler wrapper: uniform error JSON instead of HTML 500 pages. */
export const handler =
  <A extends unknown[]>(
    fn: (...args: A) => Promise<Response> | Response,
    options: { public?: boolean } = {},
  ) =>
  async (...args: A): Promise<Response> => {
    const request = args[0];
    let actor: "anonymous" | "local-owner" | `invited-${string}` = "anonymous";
    let demoMode = false;
    const finish = async (response: Response) => {
      // Do not record demo traffic in the real owner's activity database.
      if (request instanceof Request && !demoMode)
        await runWithDefaultDatabase(() => recordRequestActivity(request, actor, response.status));
      return response;
    };
    try {
      if (request instanceof Request) demoMode = hasDemoMarker(request);
      if (
        demoMode &&
        request instanceof Request &&
        !DEMO_SAFE_METHODS.has(request.method.toUpperCase())
      )
        return finish(bad("Demo mode is read-only.", 403));
      if (!hostedConfigurationValid()) return bad("Service unavailable", 503);
      if (
        process.env.JOURNAL_DEPLOYMENT_MODE === "hosted" &&
        request instanceof Request &&
        !trustedClientIp(request)
      )
        return bad("Forbidden", 403);
      if (request instanceof Request && !isTrustedWrite(request))
        return finish(bad("Forbidden", 403));
      if (demoMode) {
        // Demo mode takes precedence over owner and member cookies and always
        // selects the isolated fictional DB. It never falls back to real data.
        const response = await runWithSeededDemoDatabase(() => fn(...args));
        return finish(response);
      }
      let userId: string | null = null;
      if (!options.public && multiUserEnabled()) {
        if (!passwordConfigured()) return finish(bad("Service unavailable", 503));
        const jar = await cookies();
        if (verifySession(jar.get(AUTH_COOKIE)?.value)) {
          actor = "local-owner";
        } else {
          const user = createUserAccessStore(db.$client).authenticate(
            jar.get(USER_AUTH_COOKIE)?.value,
          );
          if (!user) return finish(bad("Unauthorized", 401));
          userId = user.id;
          actor = `invited-${user.id}`;
        }
      } else if (!options.public && passwordConfigured()) {
        const token = (await cookies()).get(AUTH_COOKIE)?.value;
        if (!verifySession(token)) return finish(bad("Unauthorized", 401));
        actor = "local-owner";
      }
      const response = userId
        ? await runWithUserDatabase(userId, () => fn(...args))
        : await fn(...args);
      return finish(response);
    } catch (error) {
      // Detailed exceptions can contain SQL, filesystem paths or provider secrets.
      const message = error instanceof RequestError ? error.message : "Internal error";
      const errorId =
        error instanceof RequestError || demoMode || !(request instanceof Request)
          ? null
          : await recordApplicationError(request, actor);
      if (!(error instanceof RequestError) && !demoMode) {
        console.error(`[UnhandledError ${errorId ?? "unrecorded"}]`, error);
      }
      return finish(
        NextResponse.json(errorId ? { error: message, errorId } : { error: message }, {
          status: error instanceof RequestError ? 400 : 500,
          headers: { "Cache-Control": "private, no-store" },
        }),
      );
    }
  };
