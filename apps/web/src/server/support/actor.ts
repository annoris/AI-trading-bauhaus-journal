import { cookies } from "next/headers";
import { db, runWithDefaultDatabase } from "@/db";
import { createUserAccessStore } from "@/server/users/access";
import {
  AUTH_COOKIE,
  USER_AUTH_COOKIE,
  multiUserEnabled,
  passwordConfigured,
  verifySession,
} from "@/server/security/auth";
import { ownerAccess } from "@/server/security/owner";

export type SupportActor =
  | { kind: "owner"; id: "local-owner"; email: "Workspace owner" }
  | { kind: "member"; id: string; email: string }
  | { kind: "demo" };

export async function supportActor(): Promise<SupportActor | null> {
  const jar = await cookies();
  if (jar.getAll("journal_demo_mode").some((cookie) => cookie.value === "1"))
    return { kind: "demo" };
  if (await ownerAccess()) return { kind: "owner", id: "local-owner", email: "Workspace owner" };
  if (!multiUserEnabled() && !passwordConfigured())
    return { kind: "owner", id: "local-owner", email: "Workspace owner" };
  const token = jar.get(USER_AUTH_COOKIE)?.value;
  const user = runWithDefaultDatabase(() => createUserAccessStore(db.$client).authenticate(token));
  if (!user) return null;
  if (user.role === "owner" && verifySession(jar.get(AUTH_COOKIE)?.value))
    return { kind: "owner", id: "local-owner", email: "Workspace owner" };
  return { kind: "member", id: user.id, email: user.email };
}
