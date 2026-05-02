import { existsSync } from "fs";
import { config } from "dotenv";
if (existsSync(".env.local")) config({ path: ".env.local" });

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: ["./src/lib/db/schema.ts", "./plugins/*/schema.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // For migrations, prefer the non-pooling direct connection when available.
    // Some hosted Postgres providers expose POSTGRES_URL_NON_POOLING for this.
    url: (process.env.DATABASE_URL ?? process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL)!,
  },
});
