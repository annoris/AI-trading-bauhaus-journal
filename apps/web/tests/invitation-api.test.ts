import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sessionToken } from "../src/server/security/auth";
let sqlite: Database.Database;
const session = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (session.token ? { value: session.token } : undefined) }),
}));
vi.mock("@/db", () => ({
  db: {
    get $client() {
      return sqlite;
    },
  },
  runWithDefaultDatabase: (callback: () => unknown) => callback(),
}));
const { GET, POST } = await import("../src/app/api/invitations/route");
beforeEach(() => {
  sqlite = new Database(":memory:");
  session.token = undefined;
});
afterEach(() => {
  sqlite.close();
  vi.unstubAllEnvs();
});
describe("owner invitation API", () => {
  it("keeps the hosted multi-user service unavailable without an owner password", async () => {
    vi.stubEnv("JOURNAL_PASSWORD", "");
    vi.stubEnv("JOURNAL_MULTI_USER", "true");
    expect((await GET()).status).toBe(503);
  });
  it("rejects a forged session", async () => {
    vi.stubEnv("JOURNAL_PASSWORD", "test-password");
    vi.stubEnv("JOURNAL_MULTI_USER", "true");
    session.token = "forged";
    expect((await GET()).status).toBe(401);
  });
  it("returns a code only on creation and excludes it from subsequent listing", async () => {
    vi.stubEnv("JOURNAL_PASSWORD", "test-password");
    vi.stubEnv("JOURNAL_MULTI_USER", "true");
    session.token = sessionToken();
    const response = await POST(
      new Request("https://journal.test/api/invitations", {
        method: "POST",
        headers: { origin: "https://journal.test" },
        body: JSON.stringify({ email: "trader@example.com" }),
      }),
    );
    expect(response.status).toBe(201);
    const created = await response.json();
    expect(created.token).toMatch(/^bh_[A-Za-z0-9_-]{43}$/);
    const listing = await GET();
    expect(listing.headers.get("cache-control")).toBe("private, no-store");
    expect(await listing.text()).not.toContain(created.token);
  });
  it("rejects cross-origin creation", async () => {
    vi.stubEnv("JOURNAL_PASSWORD", "test-password");
    vi.stubEnv("JOURNAL_MULTI_USER", "true");
    session.token = sessionToken();
    expect(
      (
        await POST(
          new Request("https://journal.test/api/invitations", {
            method: "POST",
            headers: { origin: "https://evil.test" },
            body: "{}",
          }),
        )
      ).status,
    ).toBe(403);
  });
  it("bounds the streamed request body even without Content-Length", async () => {
    vi.stubEnv("JOURNAL_PASSWORD", "test-password");
    vi.stubEnv("JOURNAL_MULTI_USER", "true");
    session.token = sessionToken();
    expect(
      (
        await POST(
          new Request("https://journal.test/api/invitations", {
            method: "POST",
            body: "x".repeat(2049),
          }),
        )
      ).status,
    ).toBe(413);
  });
});
