/**
 * Loads .env.local if the file exists.
 * On most managed platforms (including Replit production), env vars are
 * injected directly into process.env — no file is present and none is needed.
 * Import this module first in any Node/tsx script.
 */
import { existsSync } from "fs";
import { config } from "dotenv";

if (existsSync(".env.local")) {
  config({ path: ".env.local" });
}
