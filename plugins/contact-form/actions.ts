"use server";

import { db } from "../../src/lib/db";
import { getClientIp } from "../../src/lib/get-client-ip";
import { z } from "zod";
import { getConfig } from "../../src/lib/config";
import { loadPlugins } from "../../src/lib/plugin-loader";
import { pluginContactFormSubmissions } from "./schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getCurrentUser } from "../../src/lib/get-current-user";
import { createNotification, deleteNotificationByReplaceKey } from "../../src/lib/notifications";
import { getUnreadCount } from "./db";
import { submissionLimiter, SUBMISSION_RATE_LIMIT } from "../../src/lib/rate-limit";
import { verifyFormToken } from "../../src/lib/form-protection";
import { verifyTurnstile } from "../../src/lib/turnstile";
import { auditLog } from "../../src/lib/audit-log";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (user.role !== "admin") throw new Error("Forbidden: admin only");
  return user;
}

// ─── Public: submit the contact form ──────────────────────────────────────────

export interface ContactFormState {
  status: "idle" | "success" | "error";
  message: string;
}

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  // Server actions run without a layout render, so loadPlugins() may not have
  // been called yet. Idempotent — no-op if already loaded.
  await loadPlugins();

  const config = await getConfig();
  if (!config.modules.activePlugins.includes("contact-form")) {
    return { status: "error", message: "Contact form is not enabled." };
  }

  const settings = config.modules.pluginSettings?.["contact-form"] ?? {};
  const showPhone = settings.showPhone !== false;
  const requirePhone = settings.requirePhone === true;
  const showSocialUrl = settings.showSocialUrl !== false;
  const requireSocialUrl = settings.requireSocialUrl === true;
  const successMessage =
    (settings.successMessage as string) || "Thank you for your message. We'll be in touch soon.";

  // Rate limit by IP — max 5 submissions per 10 minutes.
  const headersList = await headers();
  const ip = getClientIp(headersList);
  const { success: allowed } = submissionLimiter.check(`contact:${ip}`, SUBMISSION_RATE_LIMIT);
  if (!allowed) {
    return { status: "error", message: "Too many submissions. Please try again later." };
  }

  // Honeypot — hidden field that real users never see or fill.
  // Bots that auto-fill all inputs will populate it; we silently succeed so
  // they don't know they were filtered.
  const hp = (formData.get("_hp") as string) ?? "";
  if (hp.length > 0) {
    return { status: "success", message: successMessage };
  }

  // Signed token (proof the form was rendered) + timing trap. Issued by
  // ContactFormSection via issueFormToken("contact-form").
  const tokenCheck = verifyFormToken(formData.get("_t") as string, "contact-form");
  if (!tokenCheck.ok) {
    const reason = tokenCheck.reason;
    // Always log so a misfire is never invisible (this gate sits before save+email).
    console.warn(`[contact-form] form-protection token check failed: ${reason}`);

    if (reason === "expired") {
      // Likely a real visitor who left the tab open — tell them how to recover.
      return {
        status: "error",
        message: "This form expired. Please refresh the page and send your message again.",
      };
    }

    // Only silently drop the UNAMBIGUOUS bot signals. A real browser on this
    // force-dynamic page always receives a valid token, so a missing/forged/
    // wrong-form token means a direct POST that never loaded the form.
    if (reason === "missing" || reason === "malformed" || reason === "bad_signature" || reason === "wrong_form") {
      // Mirror the honeypot: report success so the bot learns nothing.
      return { status: "success", message: successMessage };
    }

    // reason === "too_fast": a genuinely quick human can trip the 3s timing
    // floor. Silently losing a real contact message is worse than letting a fast
    // submitter through (the honeypot and per-IP rate limiter still apply), so
    // fall through and process the submission normally.
  }

  const name = (formData.get("name") as string)?.trim() ?? "";
  const email = (formData.get("email") as string)?.trim() ?? "";
  const phone = showPhone ? ((formData.get("phone") as string)?.trim() || null) : null;
  const socialUrl = showSocialUrl ? ((formData.get("socialUrl") as string)?.trim() || null) : null;
  const message = (formData.get("message") as string)?.trim() ?? "";

  if (!name) return { status: "error", message: "Name is required." };
  if (!email) return { status: "error", message: "Email address is required." };
  if (!z.string().email().safeParse(email).success) {
    return { status: "error", message: "Please enter a valid email address." };
  }
  if (showPhone && requirePhone && !phone) return { status: "error", message: "Phone number is required." };
  if (showSocialUrl && requireSocialUrl && !socialUrl) return { status: "error", message: "Social profile URL is required." };
  if (socialUrl && !z.string().url().safeParse(socialUrl).success) {
    return { status: "error", message: "Please enter a valid URL for your social profile." };
  }
  if (!message) return { status: "error", message: "Message is required." };
  if (message.length > 5000) {
    return { status: "error", message: "Message is too long (max 5000 characters)." };
  }

  // Cloudflare Turnstile — checked AFTER field validation so a validation error
  // doesn't consume the single-use token (the user's corrected resubmit reuses
  // it). No-op unless both Turnstile keys are configured. On failure we return a
  // visible error rather than silently dropping, so a real visitor who fails the
  // challenge can retry instead of losing their message.
  const turnstile = await verifyTurnstile(formData.get("cf-turnstile-response") as string, ip);
  if (!turnstile.ok) {
    console.warn(`[contact-form] Turnstile verification failed: ${turnstile.reason}`);
    return {
      status: "error",
      message: "We couldn't verify your submission. Please refresh the page and try again.",
    };
  }

  try {
    await db.insert(pluginContactFormSubmissions).values({
      name,
      email,
      phone,
      socialUrl,
      message,
    } as typeof pluginContactFormSubmissions.$inferInsert);
  } catch (err) {
    console.error("[contact-form] Failed to save submission:", err);
    return { status: "error", message: "Could not send your message. Please try again." };
  }

  // Send email notification — awaited so it completes before the serverless
  // function returns. Failures are logged but never surfaced to the visitor
  // (the submission is already saved to the database at this point).
  try {
    const { sendEmail } = await import("../../src/lib/email");
    const cfg = await getConfig();
    const to = cfg.email?.toAddress;
    if (to) {
      const phoneStr = phone ? `\nPhone: ${phone}` : "";
      const socialStr = socialUrl ? `\nSocial: ${socialUrl}` : "";
      const result = await sendEmail({
        to,
        subject: `New contact form submission from ${name}`,
        text: `Name: ${name}\nEmail: ${email}${phoneStr}${socialStr}\n\nMessage:\n${message}`,
        replyTo: email,
      });
      if (!result.ok) {
        console.error("[contact-form] Email notification failed:", result.error);
      }
    }
  } catch (err) {
    console.error("[contact-form] Email notification error:", err);
  }

  // Keep the unread notification badge current.
  const unread = await getUnreadCount();
  await createNotification({
    pluginId: "contact-form",
    message: `${unread} unread contact form submission${unread === 1 ? "" : "s"}.`,
    href: "/admin/contact",
    replaceKey: "contact-form:unread",
    itemCount: unread,
  });

  return { status: "success", message: successMessage };
}

// ─── Admin: mark a submission as read ─────────────────────────────────────────

export async function markSubmissionRead(id: number): Promise<void> {
  await requireAdmin();
  await db
    .update(pluginContactFormSubmissions)
    .set({ read: true } as Partial<typeof pluginContactFormSubmissions.$inferInsert>)
    .where(eq(pluginContactFormSubmissions.id, id));
  await syncUnreadNotification();
  revalidatePath("/admin/contact");
}

// ─── Admin: delete a submission ────────────────────────────────────────────────

export async function deleteSubmission(id: number): Promise<void> {
  const user = await requireAdmin();
  await db
    .delete(pluginContactFormSubmissions)
    .where(eq(pluginContactFormSubmissions.id, id));
  await syncUnreadNotification();
  auditLog({ action: "contact.submission_delete", userId: user.id, detail: `submissionId=${id}` });
  revalidatePath("/admin/contact");
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

async function syncUnreadNotification(): Promise<void> {
  const unread = await getUnreadCount();
  if (unread > 0) {
    await createNotification({
      pluginId: "contact-form",
      message: `${unread} unread contact form submission${unread === 1 ? "" : "s"}.`,
      href: "/admin/contact",
      replaceKey: "contact-form:unread",
      itemCount: unread,
    });
  } else {
    await deleteNotificationByReplaceKey("contact-form", "contact-form:unread");
  }
}
