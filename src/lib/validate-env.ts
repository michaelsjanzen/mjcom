/**
 * Runtime environment validation.
 * Called on app startup to catch misconfiguration early.
 * In production: throws and prevents startup.
 * In development: logs warnings only.
 */

const KNOWN_WEAK = new Set([
  "secret",
  "changeme",
  "local-dev-secret-change-in-production",
  "your-secret-here",
  "password",
]);

export function validateEnv() {
  // Next.js sets NEXT_PHASE during `next build`. Skip validation then —
  // it runs on every real request instead, so misconfigurations are still caught.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const isProd = process.env.NODE_ENV === "production";
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    errors.push("DATABASE_URL is not set (or POSTGRES_URL when supplied by the host).");
  }

  // NEXTAUTH_SECRET: warn but never hard-crash.
  // replit-init.ts auto-generates it when absent, so this should only fire on
  // non-Replit platforms where the operator forgot to set it. Crashing on every
  // request is worse than degraded auth — the operator can still access the site.
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    warnings.push("NEXTAUTH_SECRET is not set. Auth will not work. Generate: openssl rand -base64 32");
  } else if (secret.length < 32) {
    warnings.push(`NEXTAUTH_SECRET is too short (${secret.length} chars). Minimum 32 characters required.`);
  } else if (KNOWN_WEAK.has(secret.toLowerCase())) {
    warnings.push("NEXTAUTH_SECRET is set to a known weak/placeholder value. Replace before going live.");
  }

  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (!nextAuthUrl) {
    // trustHost: true is set in auth.config.ts — NextAuth v5 derives the URL from
    // the incoming request, so credentials login works without NEXTAUTH_URL.
    // It IS required for OAuth callback URLs; warn but never hard-crash on it.
    warnings.push(
      "NEXTAUTH_URL is not set. Credentials login will still work (trustHost mode). " +
      "OAuth callbacks (GitHub/Google) require it — set NEXTAUTH_URL or PRODUCTION_URL."
    );
  } else {
    try {
      const parsed = new URL(nextAuthUrl);
      if (isProd && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) {
        errors.push(
          `NEXTAUTH_URL is set to a localhost address (${nextAuthUrl}) in production. ` +
          "OAuth login will not work. Set NEXTAUTH_URL=https://your-domain.com."
        );
      }
    } catch {
      errors.push(`NEXTAUTH_URL "${nextAuthUrl}" is not a valid URL.`);
    }
  }

  // Storage provider validation
  const storageProvider = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase().trim();
  if (storageProvider === "s3") {
    const s3Required = ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;
    for (const key of s3Required) {
      if (!process.env[key]) {
        errors.push(`STORAGE_PROVIDER=s3 requires ${key} to be set.`);
      }
    }
    if (!process.env.S3_PUBLIC_URL && !process.env.S3_ENDPOINT) {
      warnings.push(
        "S3_PUBLIC_URL is not set. File URLs will default to https://{bucket}.s3.{region}.amazonaws.com. " +
        "Set S3_PUBLIC_URL to your CDN or R2 public URL for correct behaviour."
      );
    }
  } else if (storageProvider !== "local") {
    warnings.push(`Unknown STORAGE_PROVIDER="${storageProvider}". Valid values: "local", "s3". Defaulting to local.`);
  }

  // AI encryption key: warn but never hard-crash.
  // replit-init.ts auto-generates it when absent. On other platforms the
  // operator should set it, but a missing key should degrade AI features
  // gracefully rather than taking down the whole site.
  if (!process.env.AI_ENCRYPTION_KEY) {
    warnings.push("AI_ENCRYPTION_KEY is not set — AI API keys will be stored unencrypted. Generate: openssl rand -hex 32");
  } else if (process.env.AI_ENCRYPTION_KEY.length !== 64 || !/^[0-9a-f]+$/i.test(process.env.AI_ENCRYPTION_KEY)) {
    warnings.push(
      `AI_ENCRYPTION_KEY is invalid (got ${process.env.AI_ENCRYPTION_KEY.length} chars, need exactly 64 hex characters). ` +
      "Generate with: openssl rand -hex 32"
    );
  }

  // OAuth provider warnings — inform but don't block startup
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    warnings.push("GitHub OAuth not configured (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET). GitHub login will be unavailable.");
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    warnings.push("Google OAuth not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET). Google login will be unavailable.");
  }

  for (const w of warnings) console.warn(`[Pugmill] ⚠️  ${w}`);

  if (errors.length > 0) {
    const message = [
      "[Pugmill] ❌ Environment configuration errors:",
      ...errors.map(e => `  • ${e}`),
      "  See SECURITY.md and .env.example for guidance.",
    ].join("\n");
    if (isProd) throw new Error(message);
    else console.error(message);
  }
}
