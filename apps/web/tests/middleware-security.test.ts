import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";
import { sessionToken } from "../src/server/security/auth";
afterEach(() => vi.unstubAllEnvs());
describe("navigation authentication", () => {
  it("rejects a forged cookie at the page boundary", async () => {
    vi.stubEnv("JOURNAL_PASSWORD", "test-password");
    const response = await middleware(
      new NextRequest("https://journal.test/trades", {
        headers: { cookie: "journal_session=forged" },
      }),
    );
    expect(response.status).toBe(307);
  });
  it("accepts the server-issued signature using Web Crypto", async () => {
    vi.stubEnv("JOURNAL_PASSWORD", "test-password");
    const response = await middleware(
      new NextRequest("https://journal.test/trades", {
        headers: { cookie: `journal_session=${sessionToken()}` },
      }),
    );
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
  it("keeps the landing page public but redirects private pages", async () => {
    vi.stubEnv("JOURNAL_PASSWORD", "test-password");
    expect((await middleware(new NextRequest("https://journal.test/welcome"))).status).toBe(200);
    expect(
      (await middleware(new NextRequest("https://journal.test/trades"))).headers.get("location"),
    ).toBe("https://journal.test/login");
  });

  it("allows the read-only demo but rejects every write method there", async () => {
    vi.stubEnv("JOURNAL_PASSWORD", "test-password");
    vi.stubEnv("JOURNAL_MULTI_USER", "true");
    const demoPage = await middleware(
      new NextRequest("https://journal.test/dashboard", {
        headers: { cookie: "journal_demo_mode=1" },
      }),
    );
    expect(demoPage.headers.get("x-middleware-next")).toBe("1");
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const response = await middleware(
        new NextRequest("https://journal.test/api/accounts", {
          method,
          headers: { cookie: "journal_demo_mode=1; journal_session=forged" },
        }),
      );
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ error: "Demo mode is read-only." });
    }
  });

  it("keeps the minimal health endpoint public at the navigation boundary", async () => {
    vi.stubEnv("JOURNAL_PASSWORD", "test-password");
    const response = await middleware(new NextRequest("https://journal.test/api/health"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
