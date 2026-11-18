import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
export function trustedClientIp(request: Request): string | null {
  const secret = process.env.JOURNAL_PROXY_TOKEN;
  const supplied = request.headers.get("x-journal-proxy-token") ?? "";
  if (!secret || secret.length < 32 || supplied.length > 256) return null;
  const a = Buffer.from(secret),
    b = Buffer.from(supplied);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let ip = request.headers.get("x-journal-client-ip")?.trim() ?? "";
  if (ip.length > 64 || !isIP(ip)) return null;
  if (isIP(ip) === 6) {
    ip = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
    const mapped = /^::ffff:([0-9a-f]+):([0-9a-f]+)$/.exec(ip);
    if (mapped) {
      const high = parseInt(mapped[1]!, 16),
        low = parseInt(mapped[2]!, 16);
      ip = `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
    }
  }
  return ip;
}
