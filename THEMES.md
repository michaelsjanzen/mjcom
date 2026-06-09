# Pugmill Theme System

This document is the reference for building, editing, and distributing themes for Pugmill. It is written for human developers and AI agents alike.

---

## 1. Overview

A Pugmill theme controls the visual presentation of the public-facing site. Themes are self-contained packages in the `themes/` directory. Each theme ships as code -- React components, a layout wrapper, and a design token contract.

> For the design systems that influenced the built-in themes (editorial, mono, default) and the admin UX, see [`DESIGN_INFLUENCES.md`](./DESIGN_INFLUENCES.md).

The system has a clear separation of concerns:

| Layer | Who controls it | Where it lives |
|---|---|---|
| **Global settings** | Site owner, applies to any theme | Admin > Settings, stored in `siteConfig` DB table |
| **Theme settings** | Site owner, within bounds the theme defines | Admin > Design, stored in `themeDesignConfigs` DB table |
| **Theme code** | Theme author, requires a rebuild to change | `themes/<id>/` source files |

The admin UI lets site owners adjust colors, fonts, and layout toggles within the surface area the theme author has chosen to expose. Structural changes require editing theme source files.

---

## 2. Architecture

### 2.1 Three layers explained

**Global settings** are theme-agnostic. They apply regardless of which theme is active. Examples:
- Site name, tagline, logo, favicon
- Primary navigation links
- SEO defaults (OG image fallback, meta description template)
- Social profile links
- Posts per page, date format

Theme components read global settings via `getConfig()` from `@/lib/config`.

**Theme settings** are the tokens a theme has chosen to expose as user-adjustable. The theme defines the schema (which tokens, what type of control, what constraints); the admin renders the appropriate form controls; the user's choices are stored as overrides on top of the theme's defaults. Only tokens marked `editable: true` appear in the admin UI.

**Theme code** is everything else -- the component markup, responsive behavior, animation, the overall design system, and the token vocabulary itself. Changing it requires editing source files and redeploying (or asking an AI agent to rebuild from the theme's prompt).

### 2.2 CSS variable contract

Themes communicate design values to components via CSS custom properties injected into `:root` at render time. The `buildCssString()` helper in each theme's `design.ts` generates this block from the merged token config (defaults + published overrides + draft overrides if previewing).

Standard variable names all themes should define where applicable:

| CSS variable | Purpose |
|---|---|
| `--color-background` | Main page background |
| `--color-surface` | Card and panel backgrounds |
| `--color-foreground` | Primary text |
| `--color-muted` | Secondary / dimmed text |
| `--color-border` | Borders and dividers |
| `--color-accent` | Primary brand / interactive color |
| `--color-accent-fg` | Text on top of accent backgrounds |
| `--color-link` | Hyperlink color |
| `--font-sans` | Body and UI text font stack |
| `--font-mono` | Code block font stack |
| `--font-heading` | Display/heading font stack (optional — themes that distinguish heading from body type) |

Themes may define additional custom variables. Custom variables should be namespaced with the theme ID, e.g. `--mytheme-hero-height`.

### 2.3 Token flow

```
themes/<id>/design.ts          -- token definitions and defaults
       |
themeDesignConfigs (DB)        -- user overrides (draft and published rows)
       |
getDesignConfig(themeId, mode) -- merges defaults + published + draft
       |
buildCssString(config, defs)   -- generates :root { --color-*: ...; } CSS
       |
Layout.tsx <style> injection   -- applied to every public page render
       |
Theme components               -- read values via var(--color-background) etc.
```

---

## 3. The design token contract

Every theme must export a `DESIGN_TOKEN_DEFS` array from `themes/<id>/design.ts`. Each entry is a `DesignTokenDef` object:

```ts
interface DesignTokenDef {
  key: string;           // Unique identifier, camelCase. e.g. "colorBackground"
  label: string;         // Human-readable name shown in admin UI
  description?: string;  // Helper text shown below the label in admin UI
  type: "color" | "google-font" | "select";
  group: string;         // See section 3.1
  groupLabel?: string;   // Display name for the group section header. See section 3.1
  options?: { value: string; label: string }[]; // Required when type is "select"
  fontList?: "sans" | "mono" | "all"; // For type "google-font" only. Defaults to "all"
  cssVariable?: string;  // e.g. "--color-background". Omit for layout-only tokens
  default: string;       // The theme's default value for this token
  order?: number;        // Display order within the group. Lower = first. Unset sorts last.
  editable?: boolean;    // Default true. Set false to hide from admin UI.
}
```

### 3.1 Token groups

The `group` field determines where the token appears in the admin Design UI.

**Built-in groups** render as dedicated labeled sections:

| Group | Admin section |
|---|---|
| `colors` | Colors |
| `typography` | Typography |
| `layout-home` | Layout > Homepage |
| `layout-post` | Layout > Blog Post |
| `layout-page` | Layout > Static Page |

**Custom groups** (any other string) are collected into a "Theme Options" section at the bottom of the Design page. Use custom groups for settings specific to the theme's features, e.g.:

```ts
{ key: "heroStyle", group: "hero", label: "Hero style", type: "select", ... }
{ key: "cardBorderRadius", group: "card", label: "Card corner radius", type: "select", ... }
```

The group section header is derived from the `group` key by default (title-cased, hyphens become spaces). To override the header label for a custom group, set `groupLabel` on any token in that group -- the label from the first token in the group is used:

```ts
{ key: "heroStyle", group: "hero", groupLabel: "Hero Section", label: "Hero style", ... }
```

`groupLabel` is ignored for built-in groups (`colors`, `typography`, `layout-home`, `layout-post`, `layout-page`), which use their fixed labels.

### 3.2 The `editable` field

`editable: false` hides this token from the admin UI editing form. Use this for tokens that are structural to the theme's identity:

```ts
{
  key: "colorBackground",
  label: "Background",
  type: "color",
  group: "colors",
  cssVariable: "--color-background",
  default: "#0a0a0a",
  editable: false, // This theme is always dark
}
```

The token still participates in `buildCssString()` and renders to CSS. It is not shown in the admin UI.

### 3.3 Required exports

Every `themes/<id>/design.ts` must export:

```ts
export const DESIGN_TOKEN_DEFS: DesignTokenDef[]
export const DESIGN_DEFAULTS: Record<string, string>
export const SANS_FONTS: string[]
export const SERIF_FONTS: string[]        // may be [] if theme has no serif fonts
export const MONO_FONTS: string[]
export function buildGoogleFontsUrl(config: Record<string, string>): string | null
export function buildCssString(config: Record<string, string>, defs: DesignTokenDef[]): string
```

Optional but recommended:

```ts
export const COLOR_PRESETS: ColorPreset[]
export const HEADER_LAYOUTS: HeaderLayoutDef[]   // header layout presets (see src/types/theme.ts)
export const HEADER_MODIFIERS: HeaderModifiers   // capability flags for the header
```

`SERIF_FONTS` must be populated when any token uses `fontList: "serif"`. Leave it as `[]` for themes that use only sans/mono.

The `fontList` field on `google-font` tokens controls which font list the admin picker renders: `"sans"` | `"serif"` | `"mono"` | `"all"`. The Editorial theme uses `fontList: "serif"` for its `fontHeading` token to expose display serif choices separately from body fonts.

Copying `themes/_template/design.ts` as a starting point is recommended -- it contains full documentation for every export.

**Key coupling note for `buildGoogleFontsUrl`:** The template implementation reads `config.fontSans` and `config.fontMono` by name. These string keys must exactly match the `key` values of the `google-font` tokens in `DESIGN_TOKEN_DEFS`. Renaming a font token key requires updating `buildGoogleFontsUrl` to match -- otherwise the function silently falls back to system defaults.

---

## 4. The manifest contract

Every theme must have a `themes/<id>/manifest.json`:

```json
{
  "id": "your-theme-id",
  "name": "Your Theme Name",
  "version": "1.0.0",
  "description": "A one-sentence description of the theme's personality and use case.",
  "author": "Your Name or Studio",
  "authorUrl": "https://yoursite.com",
  "previewUrl": "https://preview.yourtheme.com",
  "tags": ["minimal", "blog", "dark"],
  "compatibleWith": ">=0.1.0"
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | Yes | Must match the directory name exactly. Lowercase, hyphens only. |
| `name` | Yes | Display name shown in the Themes admin page. |
| `version` | Yes | Semver. Increment on any published change. |
| `description` | Yes | Shown in the marketplace and admin UI. |
| `author` | Marketplace | Shown in marketplace listings. |
| `authorUrl` | Marketplace | Link to author's site or profile. |
| `previewUrl` | Marketplace | Live preview URL. |
| `tags` | Marketplace | Used for filtering in the marketplace. |
| `compatibleWith` | Marketplace | Semver range of compatible Pugmill versions. |

---

## 5. File structure

Every theme must include these files:

```
themes/<id>/
  manifest.json          -- identity and marketplace metadata
  design.ts              -- design token contract (required exports)
  Layout.tsx             -- root server component wrapping all theme pages
  components/
    Header.tsx           -- server component (fetches config, passes to client)
    HeaderClient.tsx     -- client component (interactivity, mobile nav)
    Footer.tsx           -- server component
  views/
    HomeView.tsx          -- receives PostSummary[] and HomeLayoutConfig
    PostView.tsx          -- receives full post data and ArticleLayoutConfig
    PageView.tsx          -- receives page data, breadcrumbs, ArticleLayoutConfig
    Sections.tsx          -- homepage section renderer (receives HomepageSection[], page)
```

`Sections.tsx` is the theme's homepage section entry point. It receives an ordered array of `HomepageSection` objects and renders each enabled section with the theme's own visual language. Themes may delegate section types to the default theme's renderers and override only the sections they want to style differently.

Additional components, views, and utilities may be added freely.

---

## 6. Building a theme

### For humans

1. Copying `themes/_template/` to `themes/<your-id>/`
2. Updating `manifest.json` with the theme's details
3. Editing `design.ts` -- defining the token vocabulary, defaults, and font allowlists
4. Building components and views -- using `var(--color-*)` and `var(--font-*)` CSS variables throughout
5. Adding the theme ID to `THEME_ALLOWLIST` in `src/lib/theme-registry.ts`
6. Registering the theme in the `ALL_THEMES` array in the same file
7. Activating the theme in the admin UI under Themes

### Database setup

**Fresh installs:** Running `npm run db:push` creates all tables from the schema.

**Existing deployments:** Running `npm run db:migrate` after pulling an update that changes the schema is required. The current migration (`scripts/migrate-001-design-config-upsert.ts`) is idempotent. It adds the `updated_at` column to `theme_design_configs`, deduplicates any existing draft/published rows, and creates the partial unique index required for the upsert workflow.

### For AI agents (Replit, Cursor, etc.)

When building or rebuilding a theme:

1. Reading this file (`THEMES.md`) and `themes/_template/design.ts` in full before writing any code
2. The `design.ts` contract is non-negotiable -- all required exports must be present
3. CSS custom properties (`var(--color-*)`) in components are required -- hardcoded color values are not permitted
4. Marking tokens `editable: false` when they are structural to the theme's identity
5. Using custom groups for theme-specific settings that don't fit built-in groups
6. Testing that `buildCssString()` produces valid CSS for all token combinations
7. Not modifying `src/` files -- themes are self-contained in `themes/<id>/`
8. The only `src/` file requiring updates is `src/lib/theme-registry.ts` (THEME_ALLOWLIST and ALL_THEMES)

---

## 7. How the admin UI works

### Themes page (`/admin/themes`)

Lists all installed themes (those in `THEME_ALLOWLIST`). The active theme has a badge. Clicking "Activate" switches the site to that theme immediately.

### Design page (`/admin/design`)

Loads the active theme's `DESIGN_TOKEN_DEFS` and renders controls for every token where `editable !== false`. Tokens are grouped into sections matching their `group` value. Custom groups appear under "Theme Options".

Changes save as a draft. The live site is unaffected until the draft is published.

### Draft / Publish / Preview workflow

- **Save draft** -- stores changes in `themeDesignConfigs` with status `draft`. Live site unchanged.
- **Preview** -- available only when a draft exists. Sets a `__pugmill_design_preview` cookie; the site renders with draft values and shows an amber preview banner. Exiting preview removes the cookie.
- **Publish** -- promotes draft to `published`; the previously published row is archived. Live site updates immediately (60s cache TTL).
- **Discard** -- deletes the draft row. Reverts to the last published state.

### Settings page (`/admin/settings`)

Global settings that apply regardless of active theme: site name, description, logo, favicon, navigation, social links, SEO defaults, analytics. These are available to all theme components via `getConfig()`.

---

## 8. Reading global settings in theme components

Using `getConfig()` from `@/lib/config` in any server component:

```ts
import { getConfig } from "@/lib/config";

export default async function Header() {
  const config = await getConfig();
  const siteName = config.site.name;
  const navItems = config.appearance.navigation;
  const logo = config.site.logo;           // media URL or null
  const socialLinks = config.site.socialLinks;
  // ...
}
```

The config is cached with a 60s TTL.

---

## 9. Plugin hooks

Themes may integrate with Pugmill plugins via the hook system:

```ts
import { hooks } from "@/lib/hooks";

// Filter: modify navigation items
const nav = await hooks.applyFilters("nav:items", { input: rawNav });

// Filter: add meta tags
const meta = await hooks.applyFilters("head:meta", { input: [] });
```

Calling these from `Layout.tsx` allows plugins to inject scripts, styles, or markup.

---

## 10. Adding a theme to the registry

After creating theme files, registering it in `src/lib/theme-registry.ts`:

```ts
export const THEME_ALLOWLIST = ["default", "your-theme-id"] as const;
```

And importing the manifest into `ALL_THEMES`:

```ts
import myThemeManifest from "../../themes/your-theme-id/manifest.json";

const ALL_THEMES: ThemeManifest[] = [
  defaultManifest,
  myThemeManifest,
];
```

The allowlist prevents path traversal attacks where a malicious `activeTheme` value in the database could cause arbitrary file imports. Only themes explicitly listed here can be activated.

---

## 11. Versioning and compatibility

- Theme versions follow semver (`major.minor.patch`)
- The `compatibleWith` field in `manifest.json` specifies which Pugmill versions the theme supports (semver range, e.g. `">=0.1.0"`)
- Breaking changes to the theme contract (required exports, CSS variable names) will be announced with a Pugmill minor version bump and migration notes
- The `_template` theme reflects the current contract -- diffing a theme's `design.ts` against `themes/_template/design.ts` is the recommended diagnostic

---

## 12. Marketplace distribution

Themes for the Pugmill Marketplace are distributed as:

1. **A code package** -- the `themes/<id>/` directory, installable by dropping it into the themes folder and registering in `theme-registry.ts`
2. **A rebuild prompt** -- a structured prompt that instructs an AI agent (Replit Agent, Cursor, etc.) to build the theme from scratch in a fresh Pugmill install. This makes themes resilient to framework upgrades -- if Next.js or Tailwind changes, the theme can be rebuilt rather than patched.

The rebuild prompt should reference this document and `themes/_template/design.ts` as its primary sources of truth for the theme contract.
