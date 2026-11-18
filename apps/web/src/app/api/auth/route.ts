import { cookies } from "next/headers";
import {
  AUTH_COOKIE,
  USER_AUTH_COOKIE,
  USER_SESSION_MAX_AGE,
  multiUserEnabled,
  passwordConfigured,
  sessionToken,
  verifyPassword,
  SESSION_MAX_AGE,
} from "@/server/security/auth";
import { db } from "@/db";
import { createUserAccessStore } from "@/server/users/access";
import { trustedClientIp } from "@/server/security/client-ip";
import { readSmallJson, allowLoginAttempt } from "@/server/security/request";
import { bad, handler, ok } from "@/server/api";

export const GET = handler(
  () =>
    ok({
      multiUser: multiUserEnabled(),
    }),
  { public: true },
);

export const POST = handler(
  async (request: Request) => {
    if (!passwordConfigured()) return ok({ authenticated: true });
    if (!allowLoginAttempt(Date.now(), trustedClientIp(request) ?? "local-shared"))
      return bad("Too many attempts. Try again later.", 429);
    let body: unknown;
    try {
      body = await readSmallJson(request);
    } catch (error) {
      return bad(
        "Invalid login request",
        error instanceof Error && error.message === "REQUEST_TOO_LARGE" ? 413 : 400,
      );
    }
    const credentials =
      body && typeof body === "object" ? (body as { email?: unknown; password?: unknown }) : {};
    const password = credentials.password;
    if (typeof credentials.email === "string") {
      if (!multiUserEnabled() || typeof password !== "string" || password.length > 1024)
        return bad("Email or password is incorrect", 401);
      const access = createUserAccessStore(db.$client);
      const user = access.authenticateCredentials(credentials.email, password);
      if (!user) return bad("Email or password is incorrect", 401);
      const token = access.issueSession(user.id);
      const jar = await cookies();
      jar.delete(AUTH_COOKIE);
      jar.set(USER_AUTH_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: new URL(process.env.JOURNAL_PUBLIC_ORIGIN || request.url).protocol === "https:",
        path: "/",
        maxAge: USER_SESSION_MAX_AGE,
      });
      return ok({ authenticated: true, role: "user" });
    }
    if (
      typeof password !== "string" ||
      !password ||
      password.length > 1024 ||
      !verifyPassword(password)
    )
      return bad("Wrong password", 401);
    const jar = await cookies();
    jar.set(AUTH_COOKIE, sessionToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(process.env.JOURNAL_PUBLIC_ORIGIN || request.url).protocol === "https:",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    jar.delete(USER_AUTH_COOKIE);
    return ok({ authenticated: true });
  },
  { public: true },
);
