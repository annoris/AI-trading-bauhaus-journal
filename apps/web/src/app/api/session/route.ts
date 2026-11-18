import { cookies } from "next/headers";
import { db } from "@/db";
import { handler, ok } from "@/server/api";
import {
  AUTH_COOKIE,
  USER_AUTH_COOKIE,
  multiUserEnabled,
  passwordConfigured,
  verifySession,
} from "@/server/security/auth";
import { createUserAccessStore } from "@/server/users/access";

export const GET = handler(
  async () => {
    const jar = await cookies();
    if (jar.getAll("journal_demo_mode").some((cookie) => cookie.value === "1"))
      return ok({ role: null, demo: true });
    if (multiUserEnabled() && passwordConfigured() && verifySession(jar.get(AUTH_COOKIE)?.value))
      return ok({ role: "owner", demo: false });
    if (multiUserEnabled()) {
      const user = createUserAccessStore(db.$client).authenticate(jar.get(USER_AUTH_COOKIE)?.value);
      if (user) return ok({ role: "member", demo: false });
    }
    return ok({ role: null, demo: false });
  },
  { public: true },
);
