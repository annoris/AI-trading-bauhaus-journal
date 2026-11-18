import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { trustedClientIp } from "../src/server/security/client-ip";
import { createActivityStore, ACTIVITY_RETENTION_MS } from "../src/server/activity/store";
import { hostedConfigurationValid } from "../src/server/security/deployment";
import { allowLoginAttempt, readSmallJson } from "../src/server/security/request";
const databases: Database.Database[] = [];
afterEach(() => {
  databases.splice(0).forEach((db) => db.close());
  vi.unstubAllEnvs();
});
const request = (ip: string, token = "p".repeat(32)) =>
  new Request("https://journal.test/api/auth", {
    headers: { "x-journal-client-ip": ip, "x-journal-proxy-token": token },
  });
describe("trusted IP and retained activity", () => {
  it("ignores untrusted/spoofed forwarded headers and normalizes mapped IPv6", () => {
    expect(trustedClientIp(request("203.0.113.5"))).toBeNull();
    vi.stubEnv("JOURNAL_PROXY_TOKEN", "p".repeat(32));
    expect(trustedClientIp(request("203.0.113.5", "wrong"))).toBeNull();
    expect(trustedClientIp(request("203.0.113.5"))).toBe("203.0.113.5");
    expect(trustedClientIp(request("::ffff:203.0.113.5"))).toBe("203.0.113.5");
    expect(trustedClientIp(request("203.0.113.5, 127.0.0.1"))).toBeNull();
  });
  it("purges at seven days and excludes encrypted IPs from owner summaries", () => {
    const db = new Database(":memory:");
    databases.push(db);
    let now = Date.now();
    const store = createActivityStore(db, {
      clock: () => now,
      seal: () => "encrypted-example",
      fingerprint: () => "keyed-example",
    });
    store.record("203.0.113.5", "test-user", "login-failed", 401);
    expect(JSON.stringify(db.prepare("SELECT * FROM security_activity").all())).not.toContain(
      "203.0.113.5",
    );
    expect(JSON.stringify(store.summary())).not.toContain("encrypted-example");
    now += ACTIVITY_RETENTION_MS;
    store.summary();
    expect(db.prepare("SELECT * FROM security_activity").all()).toHaveLength(0);
  });
  it("bounds repeated IP logging and flags repeated failures", () => {
    const db = new Database(":memory:");
    databases.push(db);
    const store = createActivityStore(db, { seal: () => "encrypted", fingerprint: () => "keyed" });
    for (let i = 0; i < 20; i++)
      expect(store.record("203.0.113.5", "anonymous", "login-failed", 401)).toBe(true);
    expect(store.record("203.0.113.5", "anonymous", "login-failed", 429)).toBe(false);
    expect(store.summary().suspiciousSources).toHaveLength(1);
  });
  it("one blocked login source does not exhaust another source", () => {
    const now = Date.now() + 120000;
    for (let i = 0; i < 20; i++) expect(allowLoginAttempt(now, "test-source-a")).toBe(true);
    expect(allowLoginAttempt(now, "test-source-a")).toBe(false);
    expect(allowLoginAttempt(now, "test-source-b")).toBe(true);
  });
  it("requires hosted secrets and an HTTPS public origin", () => {
    vi.stubEnv("JOURNAL_DEPLOYMENT_MODE", "hosted");
    vi.stubEnv("JOURNAL_PASSWORD", "");
    expect(hostedConfigurationValid()).toBe(false);
    vi.stubEnv("JOURNAL_PASSWORD", "test-password");
    vi.stubEnv("JOURNAL_SECRET", "s".repeat(32));
    vi.stubEnv("JOURNAL_PROXY_TOKEN", "p".repeat(32));
    vi.stubEnv("JOURNAL_PUBLIC_ORIGIN", "https://journal.test");
    expect(hostedConfigurationValid()).toBe(true);
    vi.stubEnv("JOURNAL_PUBLIC_ORIGIN", "http://journal.test");
    expect(hostedConfigurationValid()).toBe(false);
  });
  it("bounds login bodies without a declared content length", async () => {
    await expect(
      readSmallJson(
        new Request("https://journal.test/api/auth", { method: "POST", body: "x".repeat(2049) }),
      ),
    ).rejects.toThrow("REQUEST_TOO_LARGE");
  });
});
