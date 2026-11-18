import { cookies } from "next/headers";
import { AUTH_COOKIE, passwordConfigured, verifySession } from "./auth";
/** Local single-user owner only. This must become a verified admin-role check
 * before individual user sessions are accepted by the journal. */
export async function ownerAccess(): Promise<boolean> {
  return passwordConfigured() && verifySession((await cookies()).get(AUTH_COOKIE)?.value);
}
