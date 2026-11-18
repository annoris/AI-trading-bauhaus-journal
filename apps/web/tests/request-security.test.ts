import { afterEach, describe, expect, it, vi } from "vitest";
import { isTrustedWrite, allowLoginAttempt } from "../src/server/security/request";
import { sessionToken, verifySession } from "../src/server/security/auth";
import { handler } from "../src/server/api";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("server security boundaries", () => {
  it("rejects cross-origin writes but permits same-origin browser writes", () => {
    expect(
      isTrustedWrite(
        new Request("https://journal.test/api/notes", {
          method: "POST",
          headers: { origin: "https://evil.test" },
        }),
      ),
    ).toBe(false);
    expect(
      isTrustedWrite(
        new Request("https://journal.test/api/notes", {
          method: "POST",
          headers: { origin: "https://journal.test" },
        }),
      ),
    ).toBe(true);
    expect(
      isTrustedWrite(
        new Request("https://journal.test/api/notes", {
          method: "DELETE",
          headers: { "sec-fetch-site": "cross-site" },
        }),
      ),
    ).toBe(false);
  });
  it("supports an explicit public origin behind a reverse proxy", () => {
    vi.stubEnv("JOURNAL_PUBLIC_ORIGIN", "https://journal.test");
    expect(
      isTrustedWrite(
        new Request("http://backend:3000/api/notes", {
          method: "PATCH",
          headers: { origin: "https://journal.test" },
        }),
      ),
    ).toBe(true);
  });
  it("rejects writes before invoking the endpoint", async () => {
    const action = vi.fn((_request: Request) => new Response("changed"));
    const response = await handler(action)(
      new Request("https://journal.test/api/notes", {
        method: "POST",
        headers: { origin: "https://evil.test" },
      }),
    );
    expect(response.status).toBe(403);
    expect(action).not.toHaveBeenCalled();
  });
  it("does not disclose unexpected exception details", async () => {
    const response = await handler(() => {
      throw new Error("secret-db-path-and-api-key");
    })();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal error" });
  });
  it("issues distinct sessions and rejects expired or tampered sessions", () => {
    vi.stubEnv("JOURNAL_PASSWORD", "test-only-password");
    const token = sessionToken();
    expect(sessionToken()).not.toBe(token);
    expect(verifySession(token)).toBe(true);
    const realNow = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(realNow + 31 * 24 * 60 * 60 * 1000);
    expect(verifySession(token)).toBe(false);
    clock.mockRestore();
    expect(verifySession(token.replace(/^v2\.\d+/, "v2.1"))).toBe(false);
    expect(verifySession(token.slice(0, -1) + (token.endsWith("a") ? "b" : "a"))).toBe(false);
    vi.stubEnv("JOURNAL_PASSWORD", "rotated-password");
    expect(verifySession(token)).toBe(false);
  });
  it("limits login attempts and permits them again after the window", () => {
    const now = Date.now() + 120000;
    for (let i = 0; i < 20; i++) expect(allowLoginAttempt(now)).toBe(true);
    expect(allowLoginAttempt(now)).toBe(false);
    expect(allowLoginAttempt(now + 60001)).toBe(true);
  });
});
