"use client";

import { useActionState } from "react";
import Script from "next/script";
import { submitContactForm, type ContactFormState } from "../actions";

interface Props {
  showPhone: boolean;
  requirePhone: boolean;
  showSocialUrl: boolean;
  requireSocialUrl: boolean;
  /** Signed anti-bot token issued server-side; verified on submit. */
  token: string;
  /** Cloudflare Turnstile site key, or "" when Turnstile is not configured. */
  turnstileSiteKey: string;
}

const initial: ContactFormState = { status: "idle", message: "" };

const fieldStyle = {
  borderColor: "var(--color-border)",
  backgroundColor: "var(--color-background)",
  color: "var(--color-foreground)",
};

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted)" }}>
      {children}
    </label>
  );
}

function Required() {
  return <span style={{ color: "var(--color-foreground)" }}> *</span>;
}

function TextInput({ id, name, type = "text", required, maxLength, autoComplete, placeholder }: {
  id: string; name: string; type?: string; required?: boolean;
  maxLength?: number; autoComplete?: string; placeholder?: string;
}) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      required={required}
      maxLength={maxLength}
      autoComplete={autoComplete}
      placeholder={placeholder}
      className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
      style={fieldStyle}
    />
  );
}

export default function ContactFormUI({ showPhone, requirePhone, showSocialUrl, requireSocialUrl, token, turnstileSiteKey }: Props) {
  const [state, action, isPending] = useActionState(submitContactForm, initial);

  if (state.status === "success") {
    return (
      <div
        className="rounded-lg border p-5 text-sm"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-surface)",
          color: "var(--color-muted)",
        }}
      >
        {state.message}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {/* Honeypot — hidden from real users, filled by bots */}
      <input type="text" name="_hp" tabIndex={-1} aria-hidden="true" className="hidden" />
      {/* Signed anti-bot token (proof the form was actually rendered) */}
      <input type="hidden" name="_t" value={token} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cf-name">Name<Required /></Label>
          <TextInput id="cf-name" name="name" required maxLength={100} autoComplete="name" placeholder="Your name" />
        </div>
        <div>
          <Label htmlFor="cf-email">Email<Required /></Label>
          <TextInput id="cf-email" name="email" type="email" required maxLength={255} autoComplete="email" placeholder="you@example.com" />
        </div>
      </div>

      {showPhone && (
        <div>
          <Label htmlFor="cf-phone">Phone{requirePhone && <Required />}</Label>
          <TextInput id="cf-phone" name="phone" type="tel" required={requirePhone} maxLength={50} autoComplete="tel" placeholder="+1 (555) 000-0000" />
        </div>
      )}

      {showSocialUrl && (
        <div>
          <Label htmlFor="cf-social-url">Social Profile URL{requireSocialUrl && <Required />}</Label>
          <TextInput
            id="cf-social-url"
            name="socialUrl"
            type="url"
            required={requireSocialUrl}
            maxLength={500}
            placeholder="https://linkedin.com/in/yourprofile"
          />
        </div>
      )}

      <div>
        <Label htmlFor="cf-message">Message<Required /></Label>
        <textarea
          id="cf-message"
          name="message"
          required
          rows={5}
          maxLength={5000}
          placeholder="How can we help?"
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 resize-y"
          style={fieldStyle}
        />
      </div>

      {/* Cloudflare Turnstile — invisible bot challenge. Only when configured.
          The script auto-renders the widget and injects a hidden
          `cf-turnstile-response` field that the server action verifies. */}
      {turnstileSiteKey && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
            async
            defer
          />
          <div
            className="cf-turnstile"
            data-sitekey={turnstileSiteKey}
            data-theme="auto"
            data-refresh-expired="auto"
          />
        </>
      )}

      {state.status === "error" && (
        <p className="text-sm" style={{ color: "#dc2626" }}>
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="px-5 py-2 rounded-md text-sm font-medium transition-opacity disabled:opacity-50"
        style={{
          backgroundColor: "var(--color-foreground)",
          color: "var(--color-background)",
        }}
      >
        {isPending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
