# Pugmill Admin UX Patterns

This document defines the **interaction and content patterns** for Pugmill's admin
interface — the behavioral layer that the design tokens (see [`DESIGN_INFLUENCES.md`](./DESIGN_INFLUENCES.md))
do not cover. It answers the questions a component library can't: *when* to use which
surface, *how* a state should behave, and *what words* go in the UI.

It is written for human contributors and AI agents alike. When you add or change an
admin interaction, make it conform to these patterns — or update this document if you
are deliberately establishing a new one.

> **Status legend.** Each pattern is tagged:
> - 🟢 **As-built** — already implemented and consistent; follow the existing component.
> - 🟡 **Partial** — implemented but inconsistent or incomplete; follow the rule, expect drift.
> - 🔵 **Target** — the agreed standard; not yet fully implemented. Build toward it.

---

## 1. Choosing a feedback surface

When something happens — or needs confirming — pick the **least interruptive surface
that fits the stakes**. From least to most interruptive:

| Surface | Use when | Persistence | Component |
|---|---|---|---|
| **Inline message** | Feedback tied to a specific field or row (validation, save state) | Stays until resolved | _per-form_ 🔵 |
| **Toast** | Confirming a completed action the user just took | Auto-dismiss ~3s | [`AdminToast`](./src/components/admin/AdminToast.tsx) 🟢 |
| **Announcement banner** | Site-wide, non-urgent info not tied to one action | Until dismissed (per session) | [`AnnouncementBanner`](./src/components/admin/AnnouncementBanner.tsx) 🟢 |
| **Notification (center)** | Async/background events the user wasn't watching for | Until read | [`notifications.ts`](./src/lib/notifications.ts) 🟢 |
| **Confirmation modal** | A destructive or irreversible action needs explicit consent | Blocks until resolved | [`ConfirmDeleteModal`](./src/components/admin/ConfirmDeleteModal.tsx) 🟢 |

**Rule of thumb:** if the user *caused* it and it *succeeded*, use a toast. If it needs
their *decision*, use a modal. If they *weren't looking*, use a notification. If it's a
standing message for *everyone*, use a banner. Never use a modal to deliver information
that a toast or inline message could carry.

---

## 2. Toasts — confirming completed actions 🟢

Pattern: server actions append `?toast=<key>` to the redirect URL; [`AdminToast`](./src/components/admin/AdminToast.tsx)
reads it, shows the message, and strips the param.

- **Add a key, not a sentence.** Extend the `MESSAGES` map (`saved`, `created`,
  `deleted`, `activated`, `deactivated`). Reuse an existing key before adding one.
- **Confirmation only.** Toasts in Pugmill currently express *success*. Do **not** use
  the toast for errors or anything the user must act on — those need an inline message
  or a notification (see §1). 🟡 *Error/warning toast variants are intentionally not
  implemented; if you need one, design it here first.*
- **Timing & placement:** auto-dismiss at 3s, manual dismiss always available,
  bottom-right, `role="status"` + `aria-live="polite"`. Don't change these per-call.
- **Copy:** past tense, terse, no period. "Changes saved", "Deleted". Not "Your changes
  have been saved successfully!"

---

## 3. Destructive actions — the confirmation contract 🟢

[`ConfirmDeleteModal`](./src/components/admin/ConfirmDeleteModal.tsx) is the canonical
pattern and **replaces `window.confirm()` everywhere**. Any new destructive action must
use it (or a component that meets the same bar):

- **Name the object.** Title is `Delete {itemLabel}?` where `itemLabel` is specific —
  `"this post"`, `"category 'Technology'"`. Never a bare "Delete item?".
- **State irreversibility.** "This action cannot be undone."
- **Safe default focus.** Focus lands on **Cancel** so a stray Enter can't destroy data.
- **Reflect in-flight state.** Disable both buttons while pending; button reads
  "Deleting…". Close only after the action resolves.
- **Dismissible.** Escape and backdrop click both cancel.
- **Destructive styling.** The confirm button is the only place red (`red-600`) is used
  as a button fill. Red = irreversible. Don't use it decoratively elsewhere.

**When confirmation is required:** deletes, bulk operations affecting >1 item,
deactivating something others depend on, anything that loses user data. **When it is
not:** reversible toggles, saves, navigation. Don't over-confirm — a modal on a
reversible action trains users to click through them.

---

## 4. Announcement banners 🟢

[`AnnouncementBanner`](./src/components/admin/AnnouncementBanner.tsx): one line, full
width, dismissible **per message** (keyed in `sessionStorage`, so a new message re-shows).

- Use for standing, low-urgency, site-wide info — not action confirmation.
- Keep to one sentence. If it needs a paragraph, it's a notification or a page, not a banner.
- One banner at a time. Stacked banners are a smell — consolidate.

---

## 5. Notifications — async & background events 🟢

[`notifications.ts`](./src/lib/notifications.ts) is DB-backed with three types:
`info | warning | error`. Use it for things that happen **when the user isn't watching**
(a scheduled job failed, an integration drifted out of sync, a cron 401'd).

- Pick the type by *consequence*, not tone: `error` = something is broken and needs the
  user; `warning` = degraded or at-risk but functioning; `info` = FYI, no action.
- Write the message so it's understandable cold, hours later, out of context. Include
  *what* happened and *what to do*. Bad: "Sync failed." Good: "Storage sync failed —
  re-enter your S3 key in Settings → Storage."

---

## 6. Empty, loading, and error states — the required triad 🔵

Every list, table, or data view must define all three. Today this is **inconsistent**
across admin pages; this is the standard to converge on:

- **Empty:** explain what goes here and give the primary action. "No posts yet." +
  "Create your first post" button. Never a blank panel.
- **Loading:** show a skeleton or spinner that matches the shape of the content. Don't
  shift layout when data arrives.
- **Error:** say what failed and offer a retry or next step. Never a silent empty state
  standing in for an error — the user can't tell "nothing here" from "it broke."

---

## 7. Content & voice

The cheapest thing that makes Pugmill feel like a *system* rather than a toolkit.

- **Sentence case** for everything — headings, buttons, labels. ("Create post", not
  "Create Post" or "CREATE POST".)
- **Buttons are verbs.** "Save changes", "Delete post", "Add user". Not "OK", "Submit",
  "Yes". The button should make sense read alone, without its surrounding sentence.
- **Plain, calm, specific.** No exclamation marks, no "Oops!", no blame ("You entered an
  invalid…"). Describe the state and the fix.
- **Numbers are concrete.** "Delete 3 posts?" not "Delete selected items?".
- **Don't thank or apologize reflexively.** "Changes saved" — not "Thanks! Your changes
  were saved."

---

## 8. Accessibility baseline

`ConfirmDeleteModal` sets the bar Pugmill components should meet 🟢 — and also reveals
the current gaps 🔵.

**Required for any dialog/overlay:**
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` pointing at the title. 🟢
- Move focus into the overlay on open; restore focus to the trigger on close. 🟡 *(open
  focuses Cancel but does not restore focus on close)*
- Escape and backdrop close. 🟢
- **Focus trap** — Tab must not escape an open modal. 🔵 *(not yet implemented; the
  strongest argument for adopting Radix primitives later — see [`DESIGN_INFLUENCES.md`](./DESIGN_INFLUENCES.md))*
- Lock body scroll while open. 🔵

**Required everywhere:**
- Status messages use `aria-live` (toast uses `polite` 🟢; an error region should use
  `assertive`).
- Every icon-only button has an `aria-label` (dismiss buttons already do 🟢).
- Interactive elements reachable and operable by keyboard alone.

---

## 9. Known inconsistencies to reconcile 🟡

Surfaced while documenting the as-built components. These are **token-contract**
problems and belong to the Tier 2 work tracked in [`DESIGN_INFLUENCES.md`](./DESIGN_INFLUENCES.md);
listed here so they aren't lost:

- **Neutral color drift.** Toast and modal use Tailwind `zinc`; the theme tokens use
  `slate`; the banner uses `violet-600`. Pick one neutral ramp + one accent and route
  everything through semantic tokens.
- **Radius drift.** `ConfirmDeleteModal` is `rounded-xl`, `AdminToast` is `rounded-lg`.
  There is no defined radius scale yet — define one.
- **No shadow/elevation scale.** Overlays hand-pick `shadow-xl`. A surface that floats
  over others should pull from a named elevation token, not a literal.

Until those tokens exist, **match the nearest existing component** rather than
introducing a fourth variation.

---

*This document covers behavior and content. For tokens, color, and type — and the design
systems that influenced them — see [`DESIGN_INFLUENCES.md`](./DESIGN_INFLUENCES.md). For
building public-site themes, see [`THEMES.md`](./THEMES.md).*
