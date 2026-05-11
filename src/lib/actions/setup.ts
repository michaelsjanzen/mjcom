"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { getConfig, updateConfig } from "@/lib/config";
import { encryptString } from "@/lib/encrypt";
import { seedDefaultContent } from "../../../seeds/default-content";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-client-ip";
import { z } from "zod";
import bcrypt from "bcryptjs";

const setupLimiter = createRateLimiter({
  interval: 15 * 60 * 1000,
  uniqueTokenPerInterval: 500,
});

const setupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("A valid email address is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  siteName: z.string().min(1, "Site name is required").max(200),
  siteUrl: z.string().min(1, "Site URL is required").max(500),
  authorVoice: z.string().max(5000).optional(),
  aiProvider: z.enum(["anthropic", "openai", "gemini"]).nullable().optional(),
  aiKey: z.string().max(2000).optional(),
  aiModel: z.string().max(200).optional(),
});

async function isAlreadySetup(): Promise<boolean> {
  const rows = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
  return rows.length > 0;
}

async function testAiKey(
  provider: "anthropic" | "openai" | "gemini",
  key: string
): Promise<boolean> {
  try {
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      // 200 = valid key and model; 400 = auth ok but bad payload (key still valid)
      // 401 = invalid key; 403 = key exists but no API access
      return res.ok || res.status === 400;
    }
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      return res.ok || res.status === 400;
    }
    if (provider === "gemini") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "hi" }] }],
            generationConfig: { maxOutputTokens: 1 },
          }),
        }
      );
      return res.ok || res.status === 400;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Validate an AI provider key without saving anything.
 * Called from the SetupWizard "Test Key" button.
 */
export async function validateAiKey(
  provider: "anthropic" | "openai" | "gemini",
  key: string
): Promise<{ valid: boolean; error?: string }> {
  if (!key.trim()) return { valid: false, error: "API key cannot be empty." };
  const valid = await testAiKey(provider, key.trim());
  if (!valid) {
    return {
      valid: false,
      error: "Key rejected by the provider — check that it is correct and has API access enabled.",
    };
  }
  return { valid: true };
}

/**
 * Complete first-run setup: create admin user, update site config, seed content.
 * Returns { error } if validation fails; redirects on success.
 *
 * Wrapped in try/catch so any unexpected runtime error (DB constraint, network
 * timeout during AI key validation, slow seed) is surfaced to the client as
 * { error } and logged server-side, instead of the action body throwing and
 * the browser receiving a generic "unexpected response" / ECONNRESET. The
 * NEXT_REDIRECT signal that powers next/navigation's redirect() is detected
 * by its `digest` property and re-thrown so the framework can process it.
 */
export async function completeSetup(
  formData: FormData
): Promise<{ error: string } | void> {
  try {
    return await _runSetup(formData);
  } catch (err: unknown) {
    // NEXT_REDIRECT must propagate — it's how redirect() works in Server
    // Actions. Detect by the `digest` property the framework attaches.
    if (
      err != null &&
      typeof (err as Record<string, unknown>).digest === "string" &&
      ((err as Record<string, unknown>).digest as string).startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    if (
      err != null &&
      typeof (err as Record<string, unknown>).digest === "string" &&
      ((err as Record<string, unknown>).digest as string).startsWith("NEXT_NOT_FOUND")
    ) {
      throw err;
    }
    // Real error — log full detail for the deployment logs, return a short
    // message to the client so it shows in the wizard's error banner instead
    // of a cryptic "unexpected response".
    console.error("[Setup] completeSetup error:", err);
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return { error: `Setup failed — ${msg}` };
  }
}

async function _runSetup(
  formData: FormData
): Promise<{ error: string } | void> {
  console.log("[Setup] start");

  // Security gate: reject if already set up (race condition safe — DB is the gate)
  if (await isAlreadySetup()) {
    console.log("[Setup] already set up — refusing");
    return { error: "Setup has already been completed." };
  }

  // Rate limit: 5 attempts per 15 minutes per IP
  const hdrs = await headers();
  const ip = getClientIp(hdrs);
  const rateCheck = setupLimiter.check(ip, 5);
  if (!rateCheck.success) {
    console.log("[Setup] rate-limited", ip);
    return { error: "Too many setup attempts. Please wait 15 minutes and try again." };
  }

  // Parse and validate inputs
  const rawProvider = formData.get("aiProvider") as string;
  const raw = {
    name: (formData.get("name") as string ?? "").trim(),
    email: (formData.get("email") as string ?? "").trim().toLowerCase(),
    password: formData.get("password") as string ?? "",
    siteName: (formData.get("siteName") as string ?? "").trim(),
    siteUrl: (formData.get("siteUrl") as string ?? "").trim(),
    authorVoice: (formData.get("authorVoice") as string ?? "").trim() || undefined,
    aiProvider: rawProvider && rawProvider !== "" ? rawProvider : null,
    aiKey: (formData.get("aiKey") as string ?? "").trim() || undefined,
    aiModel: (formData.get("aiModel") as string ?? "").trim() || undefined,
  };

  const result = setupSchema.safeParse(raw);
  if (!result.success) {
    console.log("[Setup] validation failed:", result.error.issues.map(i => i.path.join(".")).join(","));
    return { error: result.error.issues.map(i => i.message).join(", ") };
  }

  const { name, email, password, siteName, siteUrl, authorVoice, aiProvider, aiKey, aiModel } =
    result.data;

  // Password confirmation (also validated client-side)
  const confirmPassword = formData.get("confirmPassword") as string ?? "";
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  // Validate AI key if a provider and key were both supplied.
  // This is a real network call to Anthropic/OpenAI/Gemini and can be the
  // single slowest part of setup on a cold container — log around it so
  // a timeout here is obvious in the deployment logs.
  if (aiProvider && aiKey) {
    console.log("[Setup] validating AI key with", aiProvider);
    const keyCheck = await testAiKey(aiProvider, aiKey);
    console.log("[Setup] AI key validation result:", keyCheck);
    if (!keyCheck) {
      return {
        error:
          "AI key validation failed — the key was rejected by the provider. Check it and try again.",
      };
    }
  }

  // Hash password
  console.log("[Setup] hashing password (bcrypt, 12 rounds)");
  const passwordHash = await bcrypt.hash(password, 12);

  // Insert admin user, get generated ID back
  console.log("[Setup] inserting admin user", email);
  const inserted = await db
    .insert(adminUsers)
    .values({
      name,
      email,
      passwordHash,
      role: "admin",
      authorVoice: authorVoice ?? null,
    } as typeof adminUsers.$inferInsert)
    .returning({ id: adminUsers.id });

  const adminId = inserted[0].id;
  console.log("[Setup] admin user inserted, id:", adminId);

  // Update site config (spread to preserve all other fields)
  console.log("[Setup] updating site config");
  const config = await getConfig();
  const aiUpdates =
    aiProvider && aiKey
      ? {
          ai: {
            ...config.ai,
            provider: aiProvider,
            apiKey: encryptString(aiKey),
            model: aiModel || defaultModel(aiProvider),
          },
        }
      : {};

  await updateConfig({
    ...config,
    site: { ...config.site, name: siteName, url: siteUrl },
    ...aiUpdates,
  });

  // Seed default content (idempotent). Can take multiple seconds on first run
  // since it inserts every default post + page. If a Replit proxy timeout
  // closes the connection, the log line below will be the last entry the
  // user sees and "redirecting to login" will never print.
  console.log("[Setup] seeding default content");
  await seedDefaultContent(adminId);
  console.log("[Setup] default content seeded");

  setupLimiter.reset(ip);
  console.log("[Setup] redirecting to /admin/login?setup=1");
  redirect("/admin/login?setup=1");
}

function defaultModel(provider: "anthropic" | "openai" | "gemini"): string {
  if (provider === "anthropic") return "claude-sonnet-4-6";
  if (provider === "openai") return "gpt-4o-mini";
  return "gemini-1.5-flash";
}
