import Database from "better-sqlite3";
import { Worker } from "node:worker_threads";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createInvitationStore } from "../src/server/invitations/store";
const connections: Database.Database[] = [];
const directories: string[] = [];
const connect = (path = ":memory:") => {
  const db = new Database(path);
  connections.push(db);
  return db;
};
afterEach(() => {
  connections.splice(0).forEach((db) => db.close());
  directories.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
});
describe("single-use invitation boundary", () => {
  it("stores only a hash and binds redemption to the intended verified email", () => {
    const db = connect(),
      store = createInvitationStore(db);
    const invite = store.create(" Trader@Example.com ");
    expect(invite.token.length).toBe(46);
    expect(JSON.stringify(db.prepare("SELECT * FROM signup_invitations").all())).not.toContain(
      invite.token,
    );
    expect(JSON.stringify(store.list())).not.toContain(invite.token);
    expect(() => store.consume(invite.token, "other@example.com", () => "user")).toThrow(
      "invalid or unavailable",
    );
    expect(store.consume(invite.token, "trader@example.com", () => "created")).toBe("created");
    expect(() => store.consume(invite.token, "trader@example.com", () => "duplicate")).toThrow(
      "invalid or unavailable",
    );
  });
  it("rejects expired and revoked invitations without creating a user", () => {
    let now = Date.now();
    const store = createInvitationStore(connect(), () => now);
    const expired = store.create("one@example.com", 1);
    const revoked = store.create("two@example.com");
    expect(store.revoke(revoked.id)).toBe(true);
    expect(() =>
      store.consume(revoked.token, revoked.email, () => {
        throw new Error("must not run");
      }),
    ).toThrow("invalid or unavailable");
    now += 3600000;
    expect(() =>
      store.consume(expired.token, expired.email, () => {
        throw new Error("must not run");
      }),
    ).toThrow("invalid or unavailable");
  });
  it("rolls back account creation and invitation consumption together on failure", () => {
    const db = connect(),
      store = createInvitationStore(db);
    db.exec("CREATE TABLE test_users (email TEXT UNIQUE)");
    const invite = store.create("one@example.com");
    expect(() =>
      store.consume(invite.token, invite.email, () => {
        db.prepare("INSERT INTO test_users VALUES (?)").run(invite.email);
        throw new Error("signup failed");
      }),
    ).toThrow("signup failed");
    expect(db.prepare("SELECT * FROM test_users").all()).toHaveLength(0);
    expect(store.consume(invite.token, invite.email, () => "retry succeeds")).toBe(
      "retry succeeds",
    );
  });
  it("cannot redeem twice across independent database connections", () => {
    const dir = mkdtempSync(join(tmpdir(), "bauhaus-invites-"));
    directories.push(dir);
    const first = createInvitationStore(connect(join(dir, "test.db")));
    const second = createInvitationStore(connect(join(dir, "test.db")));
    const invite = first.create("one@example.com");
    expect(first.consume(invite.token, invite.email, () => "first")).toBe("first");
    expect(() => second.consume(invite.token, invite.email, () => "second")).toThrow(
      "invalid or unavailable",
    );
  });
  it("rejects duplicate pending email and preserves issuance limits after revocation", () => {
    const store = createInvitationStore(connect());
    const first = store.create("one@example.com");
    expect(() => store.create(first.email)).toThrow("pending invitation");
    store.revoke(first.id);
    for (let i = 0; i < 9; i++) store.create(`trader${i}@example.com`);
    expect(() => store.create("extra@example.com")).toThrow("limit reached");
  });
  it("persists failed attempt limits with constant storage and resets after expiry", () => {
    let now = Date.now();
    const db = connect(),
      store = createInvitationStore(db, () => now);
    for (let i = 0; i < 100; i++)
      expect(() => store.consume("invalid", "one@example.com", () => null)).toThrow(
        "invalid or unavailable",
      );
    const reopened = createInvitationStore(db, () => now);
    expect(() => reopened.consume("invalid", "one@example.com", () => null)).toThrow(
      "Try again later",
    );
    expect(db.prepare("SELECT * FROM invitation_attempt_window").all()).toHaveLength(1);
    now += 300001;
    expect(() => reopened.consume("invalid", "one@example.com", () => null)).toThrow(
      "invalid or unavailable",
    );
  });
  it("only one simultaneous worker can consume the code and create a user", async () => {
    const dir = mkdtempSync(join(tmpdir(), "bauhaus-invite-race-"));
    directories.push(dir);
    const path = join(dir, "test.db"),
      db = connect(path);
    db.exec("CREATE TABLE race_users (id INTEGER)");
    const store = createInvitationStore(db),
      invite = store.create("race@example.com");
    const moduleSource = ts.transpileModule(
      readFileSync(new URL("../src/server/invitations/store.ts", import.meta.url), "utf8"),
      {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      },
    ).outputText;
    const workers = [1, 2].map(
      (id) =>
        new Worker(
          `
      const { parentPort, workerData } = require('node:worker_threads');
      (async () => {
        const Database = require(workerData.driver);
        const { createInvitationStore } = await import(workerData.module);
        const db = new Database(workerData.path);
        const store = createInvitationStore(db);
        parentPort.on('message', () => {
          let consumed = false;
          try {
            store.consume(workerData.token, workerData.email, () => {
              db.prepare('INSERT INTO race_users VALUES (?)').run(workerData.id);
            });
            consumed = true;
          } catch (error) {
            if (!error.message.includes('invalid or unavailable')) throw error;
          }
          db.close(); parentPort.postMessage(consumed);
        });
        parentPort.postMessage('ready');
      })().catch(error => { throw error; });
    `,
          {
            eval: true,
            workerData: {
              id,
              path,
              token: invite.token,
              email: invite.email,
              driver: createRequire(import.meta.url).resolve("better-sqlite3"),
              module: "data:text/javascript;base64," + Buffer.from(moduleSource).toString("base64"),
            },
          },
        ),
    );
    try {
      await Promise.all(
        workers.map(
          (worker) =>
            new Promise<void>((resolve, reject) => {
              worker.once("message", () => resolve());
              worker.once("error", reject);
            }),
        ),
      );
      const results = workers.map(
        (worker) =>
          new Promise<boolean>((resolve, reject) => {
            worker.once("message", resolve);
            worker.once("error", reject);
          }),
      );
      workers.forEach((worker) => worker.postMessage("go"));
      expect((await Promise.all(results)).filter(Boolean)).toHaveLength(1);
      expect(db.prepare("SELECT * FROM race_users").all()).toHaveLength(1);
    } finally {
      await Promise.all(workers.map((worker) => worker.terminate()));
    }
  });
});
