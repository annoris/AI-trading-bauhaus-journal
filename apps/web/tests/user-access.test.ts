import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { createUserAccessStore } from "../src/server/users/access";
const connections: Database.Database[] = [];
const open = () => {
  const db = new Database(":memory:");
  connections.push(db);
  return db;
};
afterEach(() => connections.splice(0).forEach((db) => db.close()));
describe("revocable user access", () => {
  it("suspends a user and all sessions without affecting other users", () => {
    const store = createUserAccessStore(open());
    const a = store.provisionVerifiedUser("a@example.com"),
      b = store.provisionVerifiedUser("b@example.com");
    const a1 = store.issueSession(a.id),
      a2 = store.issueSession(a.id),
      b1 = store.issueSession(b.id);
    expect(store.manage(a.id, "suspend", "owner").revokedSessions).toBe(2);
    expect(store.authenticate(a1)).toBeNull();
    expect(store.authenticate(a2)).toBeNull();
    expect(store.authenticate(b1)?.id).toBe(b.id);
    expect(() => store.issueSession(a.id)).toThrow("Access unavailable");
    store.manage(a.id, "reactivate", "owner");
    expect(store.authenticate(a1)).toBeNull();
    expect(store.authenticate(store.issueSession(a.id))?.id).toBe(a.id);
  });
  it("revokes sessions while retaining active user status and audit history", () => {
    const db = open(),
      store = createUserAccessStore(db),
      user = store.provisionVerifiedUser("a@example.com");
    const token = store.issueSession(user.id);
    store.manage(user.id, "revoke-sessions", "owner");
    expect(store.authenticate(token)).toBeNull();
    expect(store.authenticate(store.issueSession(user.id))?.status).toBe("active");
    expect(db.prepare("SELECT action FROM user_access_audit").all()).toEqual([
      { action: "revoke-sessions" },
    ]);
    expect(JSON.stringify(db.prepare("SELECT * FROM user_access_sessions").all())).not.toContain(
      token,
    );
  });
  it("expires sessions and refuses malformed tokens", () => {
    let now = Date.now();
    const store = createUserAccessStore(open(), () => now),
      user = store.provisionVerifiedUser("a@example.com");
    const token = store.issueSession(user.id);
    expect(store.authenticate(token)?.id).toBe(user.id);
    now += 86400000;
    expect(store.authenticate(token)).toBeNull();
    expect(store.authenticate("forged")).toBeNull();
  });
});
