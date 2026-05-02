import "./_load-env";
import { db } from "../src/lib/db";
import { adminUsers } from "../src/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import * as readline from "readline";
import { seedDefaultContent } from "../seeds/default-content";

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer); }));
}

async function setup() {
  console.log("\n🚀 Pugmill Setup\n");

  // Check if admin already exists
  const existing = await db.select().from(adminUsers).limit(1);
  if (existing.length > 0) {
    console.log("✅ Admin account already exists. Setup complete.");
    process.exit(0);
  }

  // Detect non-interactive contexts (Replit Agent, CI, container scripts).
  // Without this guard, readline.question() blocks indefinitely waiting on
  // stdin that the parent process can't provide — the script appears to hang
  // for hours. Fail fast and point the operator at the in-app /setup wizard.
  const interactive = !!process.stdin.isTTY;
  const haveEnvCreds = !!(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
  if (!interactive && !haveEnvCreds) {
    console.error(
      "\n❌ Admin credentials not provided and no interactive terminal available.\n" +
      "\n" +
      "On Replit and other AI-agent environments, admin creation is intended to\n" +
      "happen through the browser at /setup — not through this CLI script.\n" +
      "\n" +
      "Next steps:\n" +
      "  1. Start the dev server (npm run dev), or deploy to production.\n" +
      "  2. Open the public URL and visit /setup.\n" +
      "  3. Fill in the admin email, password, and name in the wizard.\n" +
      "\n" +
      "If you really need to run this CLI non-interactively (e.g. for automated\n" +
      "provisioning), set ADMIN_EMAIL and ADMIN_PASSWORD env vars before invoking it.\n"
    );
    process.exit(1);
  }

  // Use env vars if set (for automated setups), otherwise prompt.
  // Reject obvious placeholder values that would otherwise create an
  // unusable admin account silently.
  const PLACEHOLDER_EMAILS = new Set(["admin@example.com", "you@example.com", "user@example.com"]);
  const email = process.env.ADMIN_EMAIL || await prompt("Admin email: ");
  if (PLACEHOLDER_EMAILS.has(email.trim().toLowerCase())) {
    console.error(
      `\n❌ ADMIN_EMAIL="${email}" is a placeholder value from .env.example.\n` +
      `   Set a real email address, or run /setup in the browser instead.\n`
    );
    process.exit(1);
  }
  const password = process.env.ADMIN_PASSWORD || await prompt("Admin password (min 8 chars): ");
  const name = process.env.ADMIN_NAME || await prompt("Your name (optional): ");

  if (!email || !password) {
    console.error("❌ Email and password are required.");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("❌ Password must be at least 8 characters.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.insert(adminUsers).values({
    email,
    name: name || "Admin",
    passwordHash,
    role: "admin",
  } as typeof adminUsers.$inferInsert);

  console.log(`\n✅ Admin account created for ${email}`);
  console.log("   Visit /admin/login to sign in.\n");

  // Seed CMS config to database (no-op if already seeded)
  console.log("Seeding CMS configuration...");
  const { getConfig } = await import("../src/lib/config");
  await getConfig(); // This auto-seeds on first call
  console.log("✅ CMS configuration ready.");

  // Seed default content (no-op if posts already exist)
  console.log("Seeding default content...");
  const created = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  await seedDefaultContent(created[0].id);

  process.exit(0);
}

setup().catch(err => {
  console.error("Setup failed:", err);
  process.exit(1);
});
