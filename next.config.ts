import type { NextConfig } from "next";

// ── Image remote patterns ──────────────────────────────────────────────────────
// Always allow OAuth avatar providers used by NextAuth.
const remotePatterns: NextConfig["images"] extends { remotePatterns?: infer R } ? NonNullable<R> : never[] = [
  {
    protocol: "https",
    hostname: "avatars.githubusercontent.com",
  },
  {
    protocol: "https",
    hostname: "lh3.googleusercontent.com",
  },
  // Supabase Storage — covers any project using Supabase as the S3 provider
  {
    protocol: "https",
    hostname: "*.supabase.co",
    pathname: "/storage/v1/object/public/**",
  },
];

// If S3_PUBLIC_URL is set, parse it and allow that bucket hostname.
// Example values: "https://my-bucket.s3.amazonaws.com"
//                 "https://cdn.example.com"
if (process.env.S3_PUBLIC_URL) {
  try {
    const s3Url = new URL(process.env.S3_PUBLIC_URL);
    remotePatterns.push({
      protocol: s3Url.protocol.replace(":", "") as "https" | "http",
      hostname: s3Url.hostname,
      // Include port only when non-standard (e.g. local MinIO)
      ...(s3Url.port ? { port: s3Url.port } : {}),
      // Lock to the bucket path prefix when present (e.g. "/my-bucket/**")
      ...(s3Url.pathname && s3Url.pathname !== "/" ? { pathname: `${s3Url.pathname}/**` } : {}),
    });
  } catch {
    console.warn(
      "[Pugmill] S3_PUBLIC_URL is set but could not be parsed as a URL — remote image pattern skipped.",
      process.env.S3_PUBLIC_URL
    );
  }
}

// ── Config ────────────────────────────────────────────────────────────────────

const nextConfig: NextConfig = {
  // Hide the Next.js dev-mode indicator (the ▲/N badge that appears in the corner)
  devIndicators: false,

  // Allow proxied preview domains (Replit, Railway, Render, etc.) to load dev assets
  // without cross-origin warnings. No-op when the env var is absent.
  ...(process.env.REPLIT_DEV_DOMAIN
    ? { allowedDevOrigins: [process.env.REPLIT_DEV_DOMAIN] }
    : {}),

  images: {
    remotePatterns,
  },

  experimental: {
    serverActions: {
      // 4.5 MB ceiling on form-data Server Actions. Most managed platforms
      // cap request bodies around this value; matching it gives the app a
      // chance to reject oversized requests with a clean error rather than
      // letting the platform return a cryptic 413.
      bodySizeLimit: "4.5mb",
    },
  },

  // Explicitly set the project root to prevent Turbopack from misdetecting
  // src/app as the workspace root (Next.js 16 moved turbopack to top-level).
  turbopack: {
    root: process.cwd(),
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            // Tell browsers to use HTTPS for 2 years, including subdomains.
            // Only effective on HTTPS deployments — ignored over HTTP.
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // Stricter headers for admin routes
        source: "/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
