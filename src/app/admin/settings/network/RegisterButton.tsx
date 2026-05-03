"use client";

import { useState } from "react";

/**
 * Calls POST /api/network/register (server-side proxy) to register this site
 * with aeopugmill.com, then fills the token input so the admin can review and save.
 */
export default function RegisterButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleRegister() {
    setLoading(true);
    setError(null);
    try {
      // Call our own server-side proxy — avoids cross-origin CORS issues entirely.
      const res = await fetch("/api/network/register", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? `Registration failed (HTTP ${res.status})`);
        return;
      }

      // Fill the token input and the hidden participation field so the admin
      // can review then hit Save.
      const tokenInput = document.querySelector<HTMLInputElement>('input[name="networkToken"]');
      if (tokenInput) {
        // Field is type="text" (not type="password") so the value is
        // already visible — no type swap needed.
        tokenInput.value = data.network_token;
      }

      // Auto-enable participation
      const checkbox = document.getElementById("participateCheck") as HTMLInputElement | null;
      const hidden   = document.getElementById("participateHidden") as HTMLInputElement | null;
      if (checkbox && !checkbox.checked) {
        checkbox.checked = true;
        if (hidden) hidden.value = "true";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleRegister}
        disabled={loading}
        className="text-sm text-violet-700 hover:text-violet-900 underline underline-offset-2 disabled:opacity-50"
      >
        {loading ? "Registering…" : "Register this site to get a token →"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
