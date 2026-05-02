/**
 * Extracts the best available client IP from request headers.
 *
 * Strategy:
 *  1. x-real-ip   — single value set by nginx / most reverse proxies; not
 *                   client-spoofable when behind a trusted proxy.
 *  2. x-forwarded-for (leftmost) — added by CDN/edge infrastructure on most
 *                   managed platforms. Clients can inject extra entries
 *                   into this header when there is no trusted proxy in front,
 *                   so the email-based rate limit should always be used as a
 *                   second line of defence.
 *  3. "unknown"   — fallback when neither header is present (e.g. local dev).
 *
 * For high-security deployments behind a load balancer, consider a Redis-
 * backed rate limiter that is not bypassable by distributing requests.
 */
export function getClientIp(headers: { get(name: string): string | null }): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }

  return "unknown";
}
