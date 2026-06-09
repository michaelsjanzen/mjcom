#!/usr/bin/env node
/**
 * restore-replit.mjs
 *
 * Restores .replit from its canonical backup at scripts/replit.template.
 *
 * Replit's "Import from GitHub" can reclassify the imported repo as a Replit
 * artifact (slides, mockup, etc.) and overwrite .replit in the process — which
 * wipes the run command, the module list (incl. postgresql-16), and the deploy
 * config. If your Run button or deployment looks wrong right after an import,
 * that's what happened. Run this to put the correct .replit back, then reload
 * the workspace so Replit re-reads it.
 *
 * Usage: npm run replit:restore
 */
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const template = join(here, "replit.template");
const target = join(here, "..", ".replit");

if (!existsSync(template)) {
  console.error("✗ scripts/replit.template not found — cannot restore .replit.");
  process.exit(1);
}

const incoming = readFileSync(template, "utf8");
const current = existsSync(target) ? readFileSync(target, "utf8") : "";

if (current === incoming) {
  console.log("✓ .replit already matches the canonical template — nothing to do.");
  process.exit(0);
}

copyFileSync(template, target);
console.log("✓ Restored .replit from scripts/replit.template.");
console.log("  Reload the Replit workspace so the run/deploy config takes effect.");
