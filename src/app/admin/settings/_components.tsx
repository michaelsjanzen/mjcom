"use client";
// Shared UI primitives for settings sub-pages.

import { useEffect, useRef, useState } from "react";

export function ToggleField({
  label,
  hint,
  name,
  defaultChecked,
}: {
  label: string;
  hint?: string;
  name: string;
  defaultChecked: boolean;
}) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <span className="text-sm font-medium text-zinc-700">{label}</span>
        {hint && <p className="text-xs text-zinc-400 mt-0.5">{hint}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input type="hidden" name={name} value={on ? "true" : "false"} />
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => setOn(v => !v)}
          className={`relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
            on ? "bg-zinc-900" : "bg-zinc-200"
          }`}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-5" : "translate-x-0"
          }`} />
        </button>
      </div>
    </div>
  );
}

export function SaveButton({ label = "Save" }: { label?: string }) {
  return (
    <div className="pt-2">
      <button
        type="submit"
        className="bg-[var(--ds-blue-1000)] text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-[var(--ds-blue-900)] transition-colors"
      >
        {label}
      </button>
    </div>
  );
}

export function Field({
  label,
  name,
  defaultValue,
  hint,
  placeholder,
  textarea,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  hint?: string;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={3}
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      ) : (
        <input
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      )}
      {hint && <p className="text-xs text-zinc-400 mt-1">{hint}</p>}
    </div>
  );
}

export function PageShell({
  title,
  description,
  saved,
  children,
}: {
  title: string;
  description?: string;
  saved?: boolean;
  children: React.ReactNode;
}) {
  const [isDirty, setIsDirty] = useState(false);
  // Ignore change events that fire during the initial paint / hydration window.
  // Password managers auto-fill type="password" fields on mount, which bubbles
  // a DOM change event to this container and falsely marks the form as dirty.
  const mounted = useRef(false);
  useEffect(() => {
    // Small delay gives password managers time to auto-fill before we start
    // watching for genuine user-initiated changes.
    const t = setTimeout(() => { mounted.current = true; }, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 pt-4 sm:pt-6 pb-8 space-y-6 transition-colors duration-500 ${isDirty ? "bg-amber-50" : "bg-zinc-50"}`}
      onChange={() => { if (mounted.current && !isDirty) setIsDirty(true); }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">{title}</h2>
          {description && <p className="text-sm text-zinc-500 mt-1">{description}</p>}
        </div>
      </div>
      {saved && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 text-sm font-medium">
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Changes saved.
        </div>
      )}
      {children}
    </div>
  );
}
