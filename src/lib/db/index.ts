import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// DATABASE_URL is the canonical name. Some hosted Postgres providers inject
// POSTGRES_URL instead, so we fall back to it for zero-config setups.
// POSTGRES_URL_NON_POOLING is intentionally not used here because the Pool
// already manages connections — we want the pooler URL.
const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

// During `next build`, Next.js imports every route module to collect page data
// for static generation. DATABASE_URL is often absent from the build environment
// (most managed build containers don't receive runtime secrets by default).
//
// Throwing here at import time caused build failures even though dynamically-
// rendered pages never execute DB queries at build time.
//
// Fix: during the build phase, skip the throw and create a placeholder pool.
// The pool is lazy — it won't attempt a connection until a query is executed.
// Any page that actually queries the DB must run at request time (force-dynamic
// or using dynamic APIs like cookies/headers), so the placeholder is never used.
// At runtime (not build), the full check runs and a missing URL is still fatal.
if (!connectionString && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error(
    "No database connection string found. Set DATABASE_URL (or POSTGRES_URL when supplied by the host)."
  );
}

const isLocal =
  !!connectionString &&
  (connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1"));

// Replit's managed Postgres injects sslmode=disable — honour it explicitly.
const sslDisabled = !!connectionString && connectionString.includes("sslmode=disable");

// pg v8+ treats sslmode=require/prefer/verify-ca as verify-full (full chain
// check), which rejects Supabase's self-signed cert. Strip the sslmode query
// param and pass our own ssl option so rejectUnauthorized:false takes effect.
// Traffic remains encrypted — we're only skipping chain verification, which
// is standard for managed Postgres on serverless platforms.
const strippedUrl = connectionString
  ? connectionString.replace(/([?&])sslmode=[^&]*/g, "$1").replace(/[?&]$/, "")
  : undefined;

const noSsl = isLocal || sslDisabled;

// Use a placeholder URL during build when no real connection string is present.
// No user:password credentials — the pool is lazy and will never connect using
// this placeholder; it only exists so drizzle(pool, { schema }) can be called.
const effectiveUrl = noSsl
  ? connectionString!
  : (strippedUrl ?? "postgresql://localhost/placeholder");

const pool = new Pool({
  connectionString: effectiveUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: noSsl ? undefined : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
