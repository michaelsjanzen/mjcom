# Design Influences

This document records the design systems and products that influenced Pugmill's
visual language, its built-in themes, and its admin UX patterns.

It exists because most of this attribution lived only in people's heads. Some of
it was written down (the theme `design.ts` headers); the rest is **reconstructed
from the code** and is labelled as such below. Treat the "Recorded" entries as
authoritative and the "Inferred" entries as best-guess until confirmed.

---

## 1. Built-in themes

Each theme records its influence in the header comment of its `design.ts` and in
its `manifest.json` description.

| Theme | Influences | Source |
|---|---|---|
| **editorial** | Long-form journalism — Stripe blog, The Atlantic, Substack, Ghost's Casper. Serif display headings, generous line height, no card chrome. | **Recorded** (`themes/editorial/design.ts` header) |
| **mono** | Terminal UIs, Warp, Linear dark mode, and serious developer blogs. Monospace throughout, near-black background, single vivid accent, no rounded corners, no shadows. | **Recorded** (`themes/mono/design.ts` header) |
| **default** | **shadcn/ui** (and the wider Tailwind ecosystem). See evidence below. | **Inferred** — no original note survived; reconstructed from tokens + toolchain |

### Why `default` → shadcn/ui (the evidence)

- **Color tokens are literal Tailwind palette values:** surface `#f8fafc` (slate-50),
  text `#0f172a` (slate-900), muted `#334155` (slate-700), border `#e2e8f0`
  (slate-200), accent `#2563eb` (blue-600). Slate-as-neutral + blue-600-as-accent
  is the canonical Tailwind/shadcn starter palette.
- **Fonts:** Inter (sans) + JetBrains Mono / IBM Plex Mono (mono) — shadcn's
  default pairing.
- **Token vocabulary:** `background / surface / foreground / muted / border /
  accent / accent-fg / link` — the `background/foreground/muted/accent` naming is
  shadcn/ui's signature semantic palette (Material would say "surface/primary/
  on-primary"; IBM Carbon uses numbered layers).

> Caveat: Inter + slate + blue-600 is also just "Tailwind defaults," so the
> deliberate homage may have been Tailwind/Tailwind UI rather than shadcn
> specifically. shadcn is the most likely *named* candidate.

---

## 2. Admin application — visual & token layer

**Draws most heavily from: shadcn/ui (Tailwind lineage).**

The admin UI is built on the canonical shadcn/ui toolchain, even though the
components are hand-rolled rather than installed from shadcn (no Radix primitives
or CVA):

- `tailwindcss` — utility styling
- `clsx` + `tailwind-merge` — the shadcn `cn()` class-merging helper
- `lucide-react` — shadcn's default icon set
- `cmdk` — the command-palette primitive shadcn uses

This places Pugmill's *style layer* squarely in the shadcn/ui / Tailwind family.

---

## 3. Admin application — UX & interaction patterns

**No single comprehensive design system is followed.** The interaction patterns
are convergent "modern SaaS / dev-tool" conventions, blended with CMS-domain
patterns. Mapped to their closest influences:

| Pugmill pattern | Implementation | Closest influence |
|---|---|---|
| Command palette, top bar, dark-mode toggle | `CommandPalette` (cmdk), `TopBar`, `DarkModeToggle` | **Vercel dashboard / Linear / Raycast** — keyboard-first dev-tool UX |
| App shell + sidebar + deeply nested settings (auth, network, storage, ai, seo, email, …) | `AdminShell`, `Sidebar`, `src/app/admin/settings/*` | Enterprise-admin density à la **IBM Carbon / Shopify Polaris** (look, not their documented patterns) |
| Toasts + persistent notifications (`info / warning / error`) | `AdminToast`, `src/lib/notifications.ts` | Universal; formalized by **Polaris & Carbon** |
| Destructive-action confirmation | `ConfirmDeleteModal` | **Polaris / Carbon / Material** |
| Multi-step onboarding | `SetupWizard` | Flow design à la **Polaris / GOV.UK** |
| Content tooling — SERP preview, AEO metadata, media library, taxonomy pickers | `SerpPreview`, `AeoMetadataEditor`, `MediaDropZone`, `TaxonomyPicker` | **WordPress / Ghost** product conventions (CMS-domain, not a design system) |

---

## 4. Summary

- **Style + design tokens:** ~80% **shadcn/ui** (Tailwind ecosystem). Clear and
  intentional.
- **Interaction patterns:** convergent **Vercel + Linear** dev-tool conventions,
  with CMS-specific borrowings from **WordPress / Ghost**.
- **Known gap:** Pugmill adopts the *look* of shadcn but not the *documented
  behavioral / content guidance* of a comprehensive system. The strengths of
  Polaris and Carbon — when-to-use-which-component rules, content/voice for error
  and empty states, formal flow patterns — are not codified anywhere in Pugmill.
  This is the natural next step if the goal is to mature the design *system*
  rather than just the styling.

---

*Sections 2–4 and the `default` theme row are reconstructed from the codebase,
not from original design notes. Correct anything here if you remember the actual
intent.*
