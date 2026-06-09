import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Minimal Postgres client for first-boot setup scripts.
 *
 * Deliberately does NOT import the app's db module (`src/lib/db`). That module
 * imports the full schema barrel, throws at import time when DATABASE_URL is
 * absent, and carries Next.js build-phase placeholder logic — none of which a
 * setup script needs, and all of which make it fragile to *import timing* and
 * toolchain (tsx / Node ESM) quirks.
 *
 * In particular, `create-schema.ts` is `await import()`-ed into replit-init's
 * running module graph (not spawned as its own process like the migration
 * scripts), and resolving the app db module's named export in that nested
 * context broke first-boot on some Node/tsx versions
 * (`SyntaxError: ... does not provide an export named 'db'`).
 *
 * This factory exports a *function*, not a constructed value, so nothing is
 * evaluated (and DATABASE_URL is not read) until it is called — by which point
 * env hydration has run. It returns a bare drizzle client with no schema, which
 * is all `db.execute(sql\`...\`)` needs.
 */
export function createBootstrapDb() {
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL (or POSTGRES_URL) is required to create the database schema."
    );
  }

  const isLocal =
    connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
  const sslDisabled = connectionString.includes("sslmode=disable");
  const noSsl = isLocal || sslDisabled;

  // pg treats sslmode=require as verify-full, which rejects managed Postgres
  // self-signed certs (Supabase). Strip it and supply our own ssl option.
  const strippedUrl = connectionString
    .replace(/([?&])sslmode=[^&]*/g, "$1")
    .replace(/[?&]$/, "");

  const pool = new Pool({
    connectionString: noSsl ? connectionString : strippedUrl,
    connectionTimeoutMillis: 5000,
    ssl: noSsl ? undefined : { rejectUnauthorized: false },
  });

  return drizzle(pool);
}
