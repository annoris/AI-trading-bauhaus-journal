import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Owner and invited-member session authentication. */
export const AUTH_COOKIE = "journal_session";
export const USER_AUTH_COOKIE = "journal_user_session";
export const USER_SESSION_MAX_AGE = 60 * 60 * 24;

export const passwordConfigured = (): boolean => Boolean(process.env.JOURNAL_PASSWORD);
export const multiUserEnabled = (): boolean =>
  process.env.JOURNAL_MULTI_USER === "true" ||
  (process.env.JOURNAL_MULTI_USER !== "false" && process.env.NODE_ENV === "production");

export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const sign = (payload: string): string =>
  createHmac("sha256", process.env.JOURNAL_PASSWORD ?? "")
    .update(payload)
    .digest("hex");
export const sessionToken = (): string => {
  const payload = `v2.${Math.floor(Date.now() / 1000) + SESSION_MAX_AGE}.${randomBytes(24).toString("hex")}`;
  return `${payload}.${sign(payload)}`;
};

export const verifyPassword = (candidate: string): boolean => {
  const expected = Buffer.from(process.env.JOURNAL_PASSWORD ?? "", "utf8");
  const given = Buffer.from(candidate, "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
};

export const verifySession = (token: string | undefined): boolean => {
  if (!passwordConfigured()) return true;
  if (!token) return false;
  const parts = token.split(".");
  if (
    parts.length !== 4 ||
    parts[0] !== "v2" ||
    !/^\d+$/.test(parts[1] ?? "") ||
    !/^[a-f0-9]{48}$/.test(parts[2] ?? "") ||
    !/^[a-f0-9]{64}$/.test(parts[3] ?? "")
  )
    return false;
  const expires = Number(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expires) || expires <= now || expires > now + SESSION_MAX_AGE)
    return false;
  const expected = Buffer.from(sign(parts.slice(0, 3).join(".")), "utf8");
  const given = Buffer.from(parts[3] ?? "", "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
};
