/**
 * Migration 009 — Add aeo_network_submissions table
 *
 * Idempotency log for the AEO Intelligence Network cron job.
 * One row per reporting date — prevents double-submission if the cron fires
 * twice, and gives the admin a visible audit trail.
 *
 * Safe to run multiple times (CREATE TABLE IF NOT EXISTS guard).
 *
 * Run via: npm run db:migrate
 */
import { existsSync } from "fs";
import { config } from "dotenv";
if (existsSync(".env.local")) config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Migration 009: creating aeo_network_submissions table...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS aeo_network_submissions (
      id            SERIAL PRIMARY KEY,
      date          VARCHAR(10)  NOT NULL,
      status        VARCHAR(20)  NOT NULL,
      response_code INTEGER,
      detail        TEXT,
      submitted_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
      CONSTRAINT aeo_network_submissions_date_unique UNIQUE (date)
    )
  `);

  console.log("Migration 009: done.");
  process.exit(0);
}

main().catch(err => {
  console.error("Migration 009 failed:", err);
  process.exit(1);
});
