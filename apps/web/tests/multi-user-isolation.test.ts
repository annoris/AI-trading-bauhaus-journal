import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const requestCookies = vi.hoisted(() => ({ value: {} as Record<string, string> }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      requestCookies.value[name] ? { value: requestCookies.value[name] } : undefined,
    getAll: () => Object.entries(requestCookies.value).map(([name, value]) => ({ name, value })),
  }),
}));

const originalEnv = {
  dataDir: process.env.JOURNAL_DATA_DIR,
  multiUser: process.env.JOURNAL_MULTI_USER,
  password: process.env.JOURNAL_PASSWORD,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  openaiKey: process.env.OPENAI_API_KEY,
  marketKey: process.env.LSE_API_KEY,
};
const scratch = mkdtempSync(join(tmpdir(), "journal-multi-user-isolation-"));
process.env.JOURNAL_DATA_DIR = scratch;
process.env.JOURNAL_MULTI_USER = "true";
process.env.JOURNAL_PASSWORD = "multi-user-isolation-fixture-password";
process.env.ANTHROPIC_API_KEY = "owner-only-ai-fixture";
process.env.OPENAI_API_KEY = "";
process.env.LSE_API_KEY = "owner-only-market-fixture";

const { db, accounts, attachments, runWithDefaultDatabase, runWithUserDatabase } =
  await import("../src/db");
const { createUserAccessStore } = await import("../src/server/users/access");
const { sessionToken } = await import("../src/server/security/auth");
const { GET: getAccounts, POST: createAccount } = await import("../src/app/api/accounts/route");
const { GET: getExport } = await import("../src/app/api/export/route");
const { GET: getAttachment } = await import("../src/app/api/attachments/[id]/route");
const { GET: getSettings } = await import("../src/app/api/settings/route");
const { GET: getConnections } = await import("../src/app/api/market-data/connections/route");
const { GET: getSupport, POST: submitSupport } =
  await import("../src/app/api/support/reports/route");
const { GET: getAdminSupport } = await import("../src/app/api/admin/support/route");
const { GET: getHealth } = await import("../src/app/api/health/route");

const ownerToken = sessionToken();
const access = runWithDefaultDatabase(() => createUserAccessStore(db.$client));
const memberA = access.provisionInvitedUser("member-a@example.com", "member-a-password-123");
const memberB = access.provisionInvitedUser("member-b@example.com", "member-b-password-123");
const tokenA = access.issueSession(memberA.id);
const tokenB = access.issueSession(memberB.id);
const scopes = {
  owner: { journal_session: ownerToken },
  memberA: { journal_user_session: tokenA },
  memberB: { journal_user_session: tokenB },
};

function setScope(scope: keyof typeof scopes) {
  requestCookies.value = scopes[scope];
}

function getRequest(path: string, cookie = "") {
  return new Request(`http://localhost${path}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

function invokeApiGet(route: unknown, request: Request): Promise<Response> {
  return (route as (request: Request) => Promise<Response>)(request);
}

function seedAccount(id: string, name: string) {
  db.insert(accounts).values({ id, name, kind: "manual", createdAt: "2026-11-01" }).run();
}

beforeAll(() => {
  runWithDefaultDatabase(() => seedAccount("owner-canary", "OWNER-CANARY-PRIVATE"));
  runWithUserDatabase(memberA.id, () => {
    seedAccount("member-a-canary", "MEMBER-A-CANARY-PRIVATE");
    db.insert(attachments)
      .values({
        id: "attachment-member-a-canary",
        ownerType: "day",
        ownerId: "2026-11-01",
        name: "member-a.pdf",
        mime: "application/pdf",
        size: 16,
        data: Buffer.from("member-a-private"),
        createdAt: "2026-11-01T12:00:00Z",
      })
      .run();
  });
  runWithUserDatabase(memberB.id, () => seedAccount("member-b-canary", "MEMBER-B-CANARY-PRIVATE"));
});

afterAll(() => {
  db.$client.close();
  if (originalEnv.dataDir === undefined) delete process.env.JOURNAL_DATA_DIR;
  else process.env.JOURNAL_DATA_DIR = originalEnv.dataDir;
  if (originalEnv.multiUser === undefined) delete process.env.JOURNAL_MULTI_USER;
  else process.env.JOURNAL_MULTI_USER = originalEnv.multiUser;
  if (originalEnv.password === undefined) delete process.env.JOURNAL_PASSWORD;
  else process.env.JOURNAL_PASSWORD = originalEnv.password;
  if (originalEnv.anthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = originalEnv.anthropicKey;
  if (originalEnv.openaiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalEnv.openaiKey;
  if (originalEnv.marketKey === undefined) delete process.env.LSE_API_KEY;
  else process.env.LSE_API_KEY = originalEnv.marketKey;
  rmSync(scratch, { recursive: true, force: true });
});

describe("owner, member, and demo journal boundaries through real API handlers", () => {
  it("exposes only a minimal configured-database readiness result without a login", async () => {
    requestCookies.value = {};
    const response = await invokeApiGet(getHealth, getRequest("/api/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("keeps account reads, exports, and attachments in the authenticated journal", async () => {
    setScope("memberA");
    const aAccounts = await (await getAccounts(getRequest("/api/accounts"))).json();
    expect(aAccounts.accounts.map((row: { name: string }) => row.name)).toEqual([
      "MEMBER-A-CANARY-PRIVATE",
    ]);
    const aExport = await (await getExport(getRequest("/api/export"))).json();
    expect(aExport.accounts.map((row: { name: string }) => row.name)).toEqual([
      "MEMBER-A-CANARY-PRIVATE",
    ]);
    expect(JSON.stringify(aExport)).not.toContain("OWNER-CANARY-PRIVATE");
    expect(JSON.stringify(aExport)).not.toContain("MEMBER-B-CANARY-PRIVATE");

    const ownFile = await getAttachment(getRequest("/api/attachments/attachment-member-a-canary"), {
      params: Promise.resolve({ id: "attachment-member-a-canary" }),
    });
    expect(ownFile.status).toBe(200);
    expect(await ownFile.text()).toBe("member-a-private");
    setScope("memberB");
    const foreignFile = await getAttachment(
      getRequest("/api/attachments/attachment-member-a-canary"),
      { params: Promise.resolve({ id: "attachment-member-a-canary" }) },
    );
    expect(foreignFile.status).toBe(404);

    setScope("memberB");
    const bAccounts = await (await getAccounts(getRequest("/api/accounts"))).json();
    expect(bAccounts.accounts.map((row: { name: string }) => row.name)).toEqual([
      "MEMBER-B-CANARY-PRIVATE",
    ]);
    const bExport = await (await getExport(getRequest("/api/export"))).json();
    expect(bExport.accounts.map((row: { name: string }) => row.name)).toEqual([
      "MEMBER-B-CANARY-PRIVATE",
    ]);
    expect(JSON.stringify(bExport)).not.toContain("MEMBER-A-CANARY-PRIVATE");
    expect(JSON.stringify(bExport)).not.toContain("OWNER-CANARY-PRIVATE");

    setScope("owner");
    const ownerData = await (await getAccounts(getRequest("/api/accounts"))).json();
    expect(ownerData.accounts.map((row: { name: string }) => row.name)).toEqual([
      "OWNER-CANARY-PRIVATE",
    ]);
  });

  it("keeps provider environment credentials and allowance owner-only", async () => {
    setScope("owner");
    const ownerAi = await (await invokeApiGet(getSettings, getRequest("/api/settings"))).json();
    expect(ownerAi.aiConnections.anthropic).toMatchObject({
      configured: true,
      source: "environment",
    });
    const ownerMarket = await (
      await invokeApiGet(getConnections, getRequest("/api/market-data/connections"))
    ).json();
    expect(
      ownerMarket.connections.find((item: { id: string }) => item.id === "london-strategic-edge"),
    ).toMatchObject({ configured: true, source: "environment" });

    setScope("memberA");
    const memberAi = await (await invokeApiGet(getSettings, getRequest("/api/settings"))).json();
    expect(memberAi.aiConnections.anthropic).toMatchObject({ configured: false, source: null });
    const memberMarket = await (
      await invokeApiGet(getConnections, getRequest("/api/market-data/connections"))
    ).json();
    expect(
      memberMarket.connections.find((item: { id: string }) => item.id === "london-strategic-edge"),
    ).toMatchObject({ configured: false, source: null });

    setScope("owner");
    const demoSettings = await invokeApiGet(
      getSettings,
      getRequest("/api/settings", `journal_demo_mode=1; journal_session=${ownerToken}`),
    );
    const demoAi = await demoSettings.json();
    expect(demoAi.aiConnections.anthropic).toMatchObject({ configured: false, source: null });
  });

  it("limits support reports to their member and keeps demo requests read-only", async () => {
    setScope("memberA");
    const created = await submitSupport(
      new Request("http://localhost/api/support/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "other",
          subject: "Member A private issue",
          description: "A synthetic support request for isolation verification.",
          route: "/support",
        }),
      }),
    );
    expect(created.status).toBe(201);
    setScope("memberB");
    const bReports = await (
      await invokeApiGet(getSupport, getRequest("/api/support/reports"))
    ).json();
    expect(bReports.reports).toEqual([]);
    setScope("owner");
    const allReports = await (
      await invokeApiGet(getAdminSupport, getRequest("/api/admin/support"))
    ).json();
    expect(allReports.reports).toHaveLength(1);
    expect(allReports.reports[0].reporterEmail).toBe(memberA.email);

    const before = (await getAccounts(getRequest("/api/accounts"))).json();
    const response = await createAccount(
      new Request("http://localhost/api/accounts", {
        method: "POST",
        headers: {
          cookie: `journal_demo_mode=1; journal_session=${ownerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "DEMO-MUST-NOT-WRITE", kind: "manual" }),
      }),
    );
    expect(response.status).toBe(403);
    expect((await before).accounts.map((row: { name: string }) => row.name)).toEqual([
      "OWNER-CANARY-PRIVATE",
    ]);
    setScope("memberA");
    const sessionResponse = await getAccounts(getRequest("/api/accounts"));
    expect(sessionResponse.status).toBe(200);
    access.manage(memberA.id, "suspend", "owner");
    expect((await getAccounts(getRequest("/api/accounts"))).status).toBe(401);
    setScope("memberB");
    expect((await getAccounts(getRequest("/api/accounts"))).status).toBe(200);
    setScope("owner");
    access.manage(memberA.id, "reactivate", "owner");
    scopes.memberA = { journal_user_session: access.issueSession(memberA.id) };
  });

  it("scopes writes to the currently authenticated member database", async () => {
    setScope("memberA");
    const response = await createAccount(
      new Request("http://localhost/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "MEMBER-A-WRITE-CANARY", kind: "manual" }),
      }),
    );
    expect(response.status).toBe(200);
    setScope("memberB");
    const bAccounts = await (await getAccounts(getRequest("/api/accounts"))).json();
    expect(bAccounts.accounts.map((row: { name: string }) => row.name).join(" ")).not.toContain(
      "MEMBER-A-WRITE-CANARY",
    );
    setScope("owner");
    const ownerData = await (await getAccounts(getRequest("/api/accounts"))).json();
    expect(ownerData.accounts.map((row: { name: string }) => row.name).join(" ")).not.toContain(
      "MEMBER-A-WRITE-CANARY",
    );
  });
});
