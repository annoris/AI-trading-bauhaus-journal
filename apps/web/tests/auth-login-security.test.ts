import { afterEach, describe, expect, it, vi } from "vitest";
const jar = vi.hoisted(() => ({ set: vi.fn(), delete: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("@/db", () => ({ runWithDefaultDatabase: (callback: () => unknown) => callback() }));
const { POST } = await import("../src/app/api/auth/route");
afterEach(() => {
  vi.unstubAllEnvs();
  jar.set.mockClear();
  jar.delete.mockClear();
});
describe("login hardening behind HTTPS proxy", () => {
  it("issues a Secure cookie using public origin even when upstream is HTTP", async () => {
    vi.stubEnv("JOURNAL_PASSWORD", "test-password");
    vi.stubEnv("JOURNAL_PUBLIC_ORIGIN", "https://journal.test");
    const response = await POST(
      new Request("http://backend:3000/api/auth", {
        method: "POST",
        headers: { origin: "https://journal.test" },
        body: JSON.stringify({ password: "test-password" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(jar.set).toHaveBeenCalledWith(
      "journal_session",
      expect.any(String),
      expect.objectContaining({ secure: true, httpOnly: true, sameSite: "lax" }),
    );
  });
  it("rejects an oversized streamed login before parsing or setting a cookie", async () => {
    vi.stubEnv("JOURNAL_PASSWORD", "test-password");
    const response = await POST(
      new Request("http://localhost/api/auth", { method: "POST", body: "x".repeat(2049) }),
    );
    expect(response.status).toBe(413);
    expect(jar.set).not.toHaveBeenCalled();
  });
});
