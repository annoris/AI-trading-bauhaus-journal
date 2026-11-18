import { createHmac, randomBytes } from "node:crypto";
const limiterKey = randomBytes(32);
/** Browser writes must originate from this application. Non-browser clients
 * without Origin remain supported; authentication still applies separately. */
export function isTrustedWrite(request: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const expected = process.env.JOURNAL_PUBLIC_ORIGIN || new URL(request.url).origin;
    return origin === new URL(expected).origin;
  } catch {
    return false;
  }
}

// Bounded process-local limiter. Hosted multi-instance deployments still need
// an ingress/shared limiter; only trusted proxy IPs may become separate keys.
const buckets = new Map<string, { starts: number; count: number }>();
let globalWindow = { starts: 0, count: 0 };
export function allowLoginAttempt(now = Date.now(), key = "local-shared"): boolean {
  key = createHmac("sha256", limiterKey).update(key).digest("hex");
  for (const [id, bucket] of buckets) if (bucket.starts <= now - 60_000) buckets.delete(id);
  if (globalWindow.starts <= now - 60_000) globalWindow = { starts: now, count: 0 };
  if (globalWindow.count >= 1000) return false;
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= 1024) return false;
    bucket = { starts: now, count: 0 };
    buckets.set(key, bucket);
  }
  if (bucket.count >= 20) return false;
  bucket.count++;
  globalWindow.count++;
  return true;
}
export async function readSmallJson(request: Request, limit = 2048): Promise<unknown> {
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader)
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error("REQUEST_TOO_LARGE");
      }
      chunks.push(value);
    }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
