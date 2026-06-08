/**
 * Cloudflare Turnstile — optional, invisible bot challenge for public forms.
 *
 * Active only when BOTH keys are configured:
 *   - NEXT_PUBLIC_TURNSTILE_SITE_KEY  (public — rendered into the widget)
 *   - TURNSTILE_SECRET_KEY            (private — server-side verification)
 * If either is absent the check is skipped, so the form still works when
 * Turnstile isn't set up — and a half-configured deploy (one key but not the
 * other) can't silently block every submission. Layer it on top of the
 * honeypot, signed form token, and per-IP rate limiter.
 *
 * MIT-clean: no SDK. The client loads Cloudflare's script tag; the server
 * verifies with a plain fetch to the siteverify endpoint.
 */

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** The public site key, or null if not configured. */
export function turnstileSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
}

/** True only when both the public site key and the secret are present. */
export function turnstileConfigured(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY && !!turnstileSiteKey();
}

export type TurnstileResult = { ok: boolean; reason?: string };

/**
 * Verify a Turnstile token server-side.
 *
 * - Returns ok:true when Turnstile is not fully configured (skip).
 * - Returns ok:false (reason "missing") when the token is absent.
 * - On a network error reaching Cloudflare, FAILS OPEN — a real contact message
 *   must never be lost because Cloudflare is briefly unreachable; the honeypot,
 *   form token, and rate limiter still apply.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string
): Promise<TurnstileResult> {
  if (!turnstileConfigured()) return { ok: true };
  const secret = process.env.TURNSTILE_SECRET_KEY as string;
  if (!token) return { ok: false, reason: "missing" };

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body });
    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
    if (data.success) return { ok: true };
    return { ok: false, reason: (data["error-codes"] || []).join(",") || "failed" };
  } catch (err) {
    console.warn("[turnstile] siteverify request failed (failing open):", err);
    return { ok: true };
  }
}
