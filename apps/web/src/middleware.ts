import { hostedConfigurationValid } from "./server/security/deployment";
import { NextResponse, type NextRequest } from "next/server";

const DEMO_COOKIE = "journal_demo_mode";
const DEMO_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Validate the signature at the navigation boundary as well as in API handlers.
async function validSession(token: string | undefined, password: string): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (
    parts.length !== 4 ||
    parts[0] !== "v2" ||
    !/^\d+$/.test(parts[1] ?? "") ||
    !/^[a-f0-9]{48}$/.test(parts[2] ?? "") ||
    !/^[a-f0-9]{64}$/.test(parts[3] ?? "")
  )
    return false;
  const expires = Number(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expires) || expires <= now || expires > now + 60 * 60 * 24 * 30)
    return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signature = Uint8Array.from((parts[3] ?? "").match(/../g)!, (byte) => parseInt(byte, 16));
  return crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    new TextEncoder().encode(parts.slice(0, 3).join(".")),
  );
}

export const middleware = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const method = request.method.toUpperCase();
  const secureCookie =
    process.env.JOURNAL_DEPLOYMENT_MODE === "hosted" || request.nextUrl.protocol === "https:";

  const clearDemoCookie = (response: NextResponse) => {
    response.headers.set("Cache-Control", "private, no-store");
    response.cookies.set(DEMO_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
    return response;
  };
  // Exiting the seeded preview is always safe and returns to the public home page.
  if (normalizedPath === "/demo/exit") {
    if (!DEMO_SAFE_METHODS.has(method))
      return NextResponse.json(
        { error: "Demo mode is read-only." },
        { status: 403, headers: { "Cache-Control": "private, no-store" } },
      );
    const response = clearDemoCookie(NextResponse.next());
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  // Set the read-only demo cookie on the current host, then let the local
  // transition page navigate with a relative window.location target. This
  // avoids changing localhost/127.0.0.1 and losing the host-only cookie.
  if (normalizedPath === "/demo" || normalizedPath.startsWith("/demo/")) {
    if (!DEMO_SAFE_METHODS.has(method))
      return NextResponse.json(
        { error: "Demo mode is read-only." },
        { status: 403, headers: { "Cache-Control": "private, no-store" } },
      );
    if (!hostedConfigurationValid())
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    response.cookies.set(DEMO_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return response;
  }

  // Duplicate-cookie shadowing must fail closed: any explicit demo marker wins.
  const demoMode = request.cookies.getAll(DEMO_COOKIE).some((cookie) => cookie.value === "1");
  // A cookie grants access only to the seeded demo data and never write access.
  // Block all non-read methods at the navigation boundary before a route can run.
  if (demoMode && !DEMO_SAFE_METHODS.has(method))
    return NextResponse.json(
      { error: "Demo mode is read-only." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );

  const password = process.env.JOURNAL_PASSWORD;
  const multiUser = process.env.JOURNAL_MULTI_USER === "true";

  if (
    !password &&
    !multiUser &&
    (normalizedPath === "/login" || normalizedPath === "/accept-invitation")
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const publicPath =
    normalizedPath === "/" ||
    normalizedPath === "/login" ||
    normalizedPath === "/welcome" ||
    normalizedPath === "/accept-invitation" ||
    normalizedPath === "/privacy" ||
    normalizedPath === "/terms" ||
    normalizedPath === "/comparisons" ||
    normalizedPath === "/contact" ||
    normalizedPath === "/wall-of-love" ||
    pathname === "/api/auth" ||
    pathname === "/api/health" ||
    pathname === "/api/solana/contribution" ||
    pathname === "/api/invitations/validate" ||
    pathname === "/api/invitations/redeem" ||
    pathname === "/images/notebook/trading_bauhaus_logo.png" ||
    pathname.startsWith("/product-previews/");
  if (publicPath) {
    const response = NextResponse.next();
    return ["/", "/login", "/welcome", "/accept-invitation"].includes(normalizedPath)
      ? clearDemoCookie(response)
      : response;
  }

  if (demoMode) return NextResponse.next();

  if (!hostedConfigurationValid())
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  if (!password && !multiUser) return NextResponse.next();
  // APIs authenticate in the shared Node handler so rejected probes are audited.
  if (pathname.startsWith("/api/")) return NextResponse.next();
  const isOwnerRoute = pathname.startsWith("/owner/") || pathname === "/owner";
  if (password && (await validSession(request.cookies.get("journal_session")?.value, password)))
    return NextResponse.next();
  if (isOwnerRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const userToken = request.cookies.get("journal_user_session")?.value;
  if (multiUser && userToken && /^us_[A-Za-z0-9_-]{43}$/.test(userToken))
    return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
};
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
