/**
 * detect-site-url.ts
 *
 * Detects the best available public URL for this deployment from
 * trusted platform-injected environment variables.
 *
 * Priority order:
 *   1. NEXTAUTH_URL          — explicit override, always wins
 *   2. REPLIT_DEV_DOMAIN     — Replit (set by replit-init.ts before server starts)
 *   3. RAILWAY_PUBLIC_DOMAIN — Railway (hostname only, no protocol)
 *   4. RENDER_EXTERNAL_URL   — Render (full https:// URL)
 *   5. null                  — unknown host; caller falls back to localhost
 *
 * Security note: all vars here are injected by trusted infrastructure,
 * never derived from HTTP request headers. Auto-detection from these
 * sources is safe for use as NEXTAUTH_URL / config.site.url.
 */
export function detectSiteUrl(): string | null {
  const e = process.env;

  // Strip trailing slashes from any detected URL so callers can safely
  // append paths without producing double-slash URLs (e.g. NEXTAUTH_URL
  // is sometimes set with a trailing slash).
  const clean = (url: string) => url.replace(/\/+$/, "");

  if (e.NEXTAUTH_URL)
    return clean(e.NEXTAUTH_URL);

  if (e.REPLIT_DEV_DOMAIN)
    return `https://${e.REPLIT_DEV_DOMAIN}`;

  if (e.RAILWAY_PUBLIC_DOMAIN)
    return `https://${e.RAILWAY_PUBLIC_DOMAIN}`;

  if (e.RENDER_EXTERNAL_URL)
    return clean(e.RENDER_EXTERNAL_URL); // already includes https://

  return null;
}

/**
 * URL detection for the /setup wizard.
 *
 * Same as detectSiteUrl() but checks PRODUCTION_URL before REPLIT_DEV_DOMAIN,
 * and skips NEXTAUTH_URL when it is itself a dev URL.
 *
 * On Replit dev containers, replit-init.ts writes NEXTAUTH_URL = <dev-domain>
 * to .env.local at startup. If NEXTAUTH_URL were checked unconditionally it
 * would always win over PRODUCTION_URL, causing the setup wizard to pre-fill
 * with the dev domain even when the production URL is known.
 *
 * Priority:
 *   1. NEXTAUTH_URL — only when it is a production URL (not a dev domain)
 *   2. PRODUCTION_URL
 *   3. REPLIT_DEV_DOMAIN / other platform vars (fallback)
 */
export function detectSetupUrl(): string | null {
  const e = process.env;

  if (e.NEXTAUTH_URL && !isDevUrl(e.NEXTAUTH_URL))
    return e.NEXTAUTH_URL;

  if (e.PRODUCTION_URL)
    return e.PRODUCTION_URL.startsWith("https://")
      ? e.PRODUCTION_URL
      : `https://${e.PRODUCTION_URL}`;

  if (e.REPLIT_DEV_DOMAIN)
    return `https://${e.REPLIT_DEV_DOMAIN}`;

  if (e.RAILWAY_PUBLIC_DOMAIN)
    return `https://${e.RAILWAY_PUBLIC_DOMAIN}`;

  if (e.RENDER_EXTERNAL_URL)
    return e.RENDER_EXTERNAL_URL;

  return null;
}

/**
 * Returns true when the given URL looks like a local dev address or
 * an uninitialized placeholder. Used to decide whether to show the
 * "configure your production URL" warning banner in the admin.
 */
export function isDevUrl(url: string): boolean {
  return (
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(url) ||
    url.includes(".replit.dev") ||
    url.includes(".repl.co")
  );
}
