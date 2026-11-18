import { cookies } from "next/headers";
import { db } from "@/db";
import { createUserAccessStore } from "@/server/users/access";
import { handler, ok } from "@/server/api";
import { AUTH_COOKIE, USER_AUTH_COOKIE } from "@/server/security/auth";

export const POST = handler(
  async () => {
    const jar = await cookies();
    const token = jar.get(USER_AUTH_COOKIE)?.value;
    if (token) createUserAccessStore(db.$client).revokeSession(token);
    jar.delete(AUTH_COOKIE);
    jar.delete(USER_AUTH_COOKIE);
    return ok({ loggedOut: true });
  },
  { public: true },
);
