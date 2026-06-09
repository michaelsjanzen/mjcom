"use client";
import { useState } from "react";

/**
 * Client toggle for the AEO Network participation switch.
 *
 * NetworkPage is a Server Component, so it can't attach onChange handlers.
 * This component owns the checkbox state in React and mirrors it into a
 * hidden input named "participateInNetwork" — the field the server action
 * (saveNetworkSettings) actually reads. Replaces a former inline <script>
 * that synced the two via the DOM (which App Router does not execute).
 */
export default function ParticipateToggle({
  defaultChecked,
}: {
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
      <input
        type="checkbox"
        id="participateCheck"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="sr-only peer"
      />
      <input
        type="hidden"
        name="participateInNetwork"
        value={checked ? "true" : "false"}
      />
      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:bg-violet-600 transition-colors" />
      <div className="absolute left-0.5 top-0.5 bg-white border border-zinc-300 rounded-full h-5 w-5 transition-all peer-checked:translate-x-5 peer-checked:border-white" />
    </label>
  );
}
