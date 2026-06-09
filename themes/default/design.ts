// PUGMILL_DESIGN_REGISTRY
// ============================================================
// This file is the design system contract for the "default" theme.
// It defines all design tokens, their defaults, and helpers for
// injecting CSS custom properties and loading Google Fonts.
//
// AI agents: When creating a new theme, copy this file to
//   /themes/<theme-id>/design.ts
// and export the same symbols. See /themes/_template/design.ts
// for the fully documented interface contract.
//
// The 'default' theme ID is reserved as the system fallback.
// NEVER remove 'default' from THEME_ALLOWLIST in src/lib/theme-registry.ts.
//
// Influence (inferred, not an original design note): shadcn/ui and the wider
// Tailwind ecosystem. Slate neutrals + blue-600 accent + Inter / JetBrains Mono,
// with the background/surface/foreground/muted/accent token vocabulary shadcn
// popularized. See /DESIGN_INFLUENCES.md for the evidence and caveats.
// ============================================================

import type { DesignTokenDef, ColorPreset } from "../../src/types/design";
import type { WidgetAreaDef } from "../../src/types/widget";
import type { HeaderLayoutDef, HeaderModifiers, FooterLayoutDef } from "../../src/types/theme";

// ─── Layout config types ──────────────────────────────────────────────────────

export interface HomeLayoutConfig {
  feedStyle: "list" | "grid";
  listStyle: "compact" | "editorial" | "feature" | "text-only";
  columns: 1 | 2 | 3;
  gap: "sm" | "md" | "lg";
  /** Which post preview to show in each card: the excerpt, or no preview text at all. */
  contentDisplay: "excerpt" | "none";
}

export interface HeroConfig {
  enabled: boolean;
  height: "short" | "medium" | "tall" | "full";
  imageUrl: string;
  overlayColor: string;
  overlayStyle: "flat" | "gradient-up" | "gradient-down";
  overlayOpacity: number;
  showHeadline: boolean;
  headline: string;
  showSubheadline: boolean;
  subheadline: string;
  contentAlign: "left" | "center";
  contentPosition: "top" | "center" | "bottom";
  cta1Enabled: boolean;
  cta1Text: string;
  cta1Url: string;
  cta1Style: "filled" | "outline";
  cta2Enabled: boolean;
  cta2Text: string;
  cta2Url: string;
  cta2Style: "filled" | "outline";
}

export function extractHeroConfig(config: Record<string, string>): HeroConfig {
  return {
    enabled: config.heroEnabled === "true",
    height: (config.heroHeight as HeroConfig["height"]) ?? "medium",
    imageUrl: config.heroImageUrl ?? "",
    overlayColor: config.heroOverlayColor ?? "#000000",
    overlayStyle: (config.heroOverlayStyle as HeroConfig["overlayStyle"]) ?? "gradient-up",
    overlayOpacity: Number(config.heroOverlayOpacity ?? "60"),
    showHeadline: config.heroShowHeadline !== "false",
    headline: config.heroHeadline ?? "Welcome",
    showSubheadline: config.heroShowSubheadline !== "false",
    subheadline: config.heroSubheadline ?? "",
    contentAlign: (config.heroContentAlign as "left" | "center") ?? "center",
    contentPosition: (config.heroContentPosition as HeroConfig["contentPosition"]) ?? "bottom",
    cta1Enabled: config.heroCta1Enabled === "true",
    cta1Text: config.heroCta1Text ?? "",
    cta1Url: config.heroCta1Url ?? "/",
    cta1Style: (config.heroCta1Style as "filled" | "outline") ?? "filled",
    cta2Enabled: config.heroCta2Enabled === "true",
    cta2Text: config.heroCta2Text ?? "",
    cta2Url: config.heroCta2Url ?? "",
    cta2Style: (config.heroCta2Style as "filled" | "outline") ?? "outline",
  };
}

export interface ArticleLayoutConfig {
  contentWidth: "narrow" | "medium" | "wide";
  sidebar: "none" | "left" | "right";
}

// ─── Font allowlists ──────────────────────────────────────────────────────────
// Only fonts in these lists will be fetched from Google Fonts.
// Fonts NOT in either list are assumed to be system fonts.

// ─── Header layout registry ───────────────────────────────────────────────────
// Declares which header layout presets this theme implements.
// The admin reads this and renders one tile per entry.

export const HEADER_LAYOUTS: HeaderLayoutDef[] = [
  { id: "standard",  label: "Standard",  description: "Logo left, nav right" },
  { id: "centered",  label: "Centered",  description: "Logo centered, nav below" },
  { id: "split",     label: "Split",     description: "Logo left, nav center" },
  { id: "cta",       label: "With CTA",  description: "Logo left, nav right, CTA button" },
  { id: "minimal",   label: "Minimal",   description: "Logo only, hamburger always" },
];

export const HEADER_MODIFIERS: HeaderModifiers = {
  supportsSticky: true,
  supportsBackgroundStyles: ["solid", "glass"],
  supportsCompactHeight: true,
  supportsLogo: true,
};

export const FOOTER_LAYOUTS: FooterLayoutDef[] = [
  { id: "simple",   label: "Simple",   description: "Nav row + copyright left, social right" },
  { id: "centered", label: "Centered", description: "All content centered" },
  { id: "columns",  label: "Columns",  description: "Site info left, nav + social right" },
  { id: "minimal",  label: "Minimal",  description: "Copyright line only" },
];

export const SERIF_FONTS: string[] = [];  // Default theme uses sans-serif only

export const SANS_FONTS: string[] = [
  "Inter",
  "DM Sans",
  "Outfit",
  "Manrope",
  "Plus Jakarta Sans",
  "Nunito Sans",
];

export const MONO_FONTS: string[] = [
  "JetBrains Mono",
  "Fira Code",
  "Source Code Pro",
  "IBM Plex Mono",
];

// System fonts — no Google Fonts request needed for these.
const SYSTEM_FONTS = ["system-ui", "serif", "monospace"];

// ─── Widget areas ─────────────────────────────────────────────────────────────
// Declares the named widget slots this theme supports.
// Each area maps to a configKey stored in the design config (comma-separated widget IDs).

export const WIDGET_AREAS: WidgetAreaDef[] = [
  {
    id: "sidebar-post",
    label: "Post Sidebar",
    configKey: "sidebarPostWidgets",
    defaultWidgets: [],
  },
  {
    id: "sidebar-page",
    label: "Page Sidebar",
    configKey: "sidebarPageWidgets",
    defaultWidgets: [],
  },
  {
    id: "post-footer",
    label: "Post Footer",
    configKey: "postFooterWidgets",
    defaultWidgets: [],
  },
  {
    id: "page-footer",
    label: "Page Footer",
    configKey: "pageFooterWidgets",
    defaultWidgets: [],
  },
];

// ─── Token definitions ────────────────────────────────────────────────────────

export const DESIGN_TOKEN_DEFS: DesignTokenDef[] = [
  // Colors
  {
    key: "colorBackground",
    label: "Background",
    description: "Main page background color.",
    type: "color",
    group: "colors",
    cssVariable: "--color-background",
    default: "#ffffff",
    editable: true,
    order: 1,
  },
  {
    key: "colorSurface",
    label: "Surface",
    description: "Card and panel backgrounds.",
    type: "color",
    group: "colors",
    cssVariable: "--color-surface",
    default: "#f8fafc",
    editable: true,
    order: 2,
  },
  {
    key: "colorForeground",
    label: "Foreground",
    description: "Primary text color.",
    type: "color",
    group: "colors",
    cssVariable: "--color-foreground",
    default: "#0f172a",
    editable: true,
    order: 3,
  },
  {
    key: "colorMuted",
    label: "Muted",
    description: "Secondary / dimmed text color.",
    type: "color",
    group: "colors",
    cssVariable: "--color-muted",
    default: "#334155",
    editable: true,
    order: 4,
  },
  {
    key: "colorBorder",
    label: "Border",
    description: "Default border and divider color.",
    type: "color",
    group: "colors",
    cssVariable: "--color-border",
    default: "#e2e8f0",
    editable: true,
    order: 5,
  },
  {
    key: "colorAccent",
    label: "Accent",
    description: "Primary brand / interactive color.",
    type: "color",
    group: "colors",
    cssVariable: "--color-accent",
    default: "#2563eb",
    editable: true,
    order: 6,
  },
  {
    key: "colorAccentFg",
    label: "Accent foreground",
    description: "Text color on top of accent backgrounds.",
    type: "color",
    group: "colors",
    cssVariable: "--color-accent-fg",
    default: "#ffffff",
    editable: true,
    order: 7,
  },
  {
    key: "colorLink",
    label: "Link",
    description: "Hyperlink color.",
    type: "color",
    group: "colors",
    cssVariable: "--color-link",
    default: "#2563eb",
    editable: true,
    order: 8,
  },

  // Typography
  {
    key: "fontSans",
    label: "Sans-serif font",
    description: "Body and UI text font.",
    type: "google-font",
    fontList: "sans",
    group: "typography",
    cssVariable: "--font-sans",
    default: "Inter",
    editable: true,
    order: 1,
  },
  {
    key: "fontMono",
    label: "Monospace font",
    description: "Code blocks and inline code.",
    type: "google-font",
    fontList: "mono",
    group: "typography",
    cssVariable: "--font-mono",
    default: "JetBrains Mono",
    editable: true,
    order: 2,
  },
  {
    key: "baseFontSize",
    label: "Base font size",
    description: "Body and article text size. Increase if your audience benefits from larger type.",
    type: "select",
    group: "typography",
    cssVariable: "--font-size-base",
    options: [
      { value: "1rem",     label: "Normal (16px)" },
      { value: "1.0625rem", label: "Comfortable (17px)" },
      { value: "1.125rem", label: "Large (18px)" },
      { value: "1.25rem",  label: "Extra Large (20px)" },
    ],
    default: "1rem",
    editable: true,
    order: 3,
  },

  // Layout — Home
  {
    key: "homeFeedStyle",
    label: "Feed style",
    description: "Display posts as a list or a grid.",
    type: "select",
    group: "layout-home",
    options: [
      { value: "list", label: "List" },
      { value: "grid", label: "Grid" },
    ],
    default: "list",
    editable: true,
  },
  {
    key: "homeListStyle",
    label: "List style",
    description: "Visual layout of each post row when feed style is List.",
    type: "select",
    group: "layout-home",
    options: [
      { value: "compact", label: "Compact — text left, thumbnail right" },
      { value: "editorial", label: "Editorial — large image left, text right" },
      { value: "feature", label: "Feature — full-width image above text" },
      { value: "text-only", label: "Text only — no images" },
    ],
    default: "compact",
    editable: true,
  },
  {
    key: "homeColumns",
    label: "Grid columns",
    description: "Number of columns when feed style is grid.",
    type: "select",
    group: "layout-home",
    options: [
      { value: "1", label: "1 column" },
      { value: "2", label: "2 columns" },
      { value: "3", label: "3 columns" },
    ],
    default: "1",
    editable: true,
  },
  {
    key: "homeContentDisplay",
    label: "Content",
    description: "What preview text to show in each card on the homepage.",
    type: "select",
    group: "layout-home",
    options: [
      { value: "excerpt", label: "Excerpt" },
      { value: "none", label: "None" },
    ],
    default: "excerpt",
    editable: true,
  },
  {
    key: "homeGap",
    label: "Gap",
    description: "Spacing between cards.",
    type: "select",
    group: "layout-home",
    options: [
      { value: "sm", label: "Small" },
      { value: "md", label: "Medium" },
      { value: "lg", label: "Large" },
    ],
    default: "md",
    editable: true,
  },

  // Layout — Blog
  {
    key: "blogFeedStyle",
    label: "Feed style",
    description: "Display blog posts as a list or a grid.",
    type: "select",
    group: "layout-blog",
    options: [
      { value: "list", label: "List" },
      { value: "grid", label: "Grid" },
    ],
    default: "list",
    editable: true,
  },
  {
    key: "blogListStyle",
    label: "List style",
    description: "Visual layout of each post row when feed style is List.",
    type: "select",
    group: "layout-blog",
    options: [
      { value: "compact", label: "Compact — text left, thumbnail right" },
      { value: "editorial", label: "Editorial — large image left, text right" },
      { value: "feature", label: "Feature — full-width image above text" },
      { value: "text-only", label: "Text only — no images" },
    ],
    default: "compact",
    editable: true,
  },
  {
    key: "blogColumns",
    label: "Grid columns",
    description: "Number of columns when feed style is grid.",
    type: "select",
    group: "layout-blog",
    options: [
      { value: "1", label: "1 column" },
      { value: "2", label: "2 columns" },
      { value: "3", label: "3 columns" },
    ],
    default: "1",
    editable: true,
  },
  {
    key: "blogContentDisplay",
    label: "Content",
    description: "What preview text to show in each card on the blog archive.",
    type: "select",
    group: "layout-blog",
    options: [
      { value: "excerpt", label: "Excerpt" },
      { value: "none", label: "None" },
    ],
    default: "excerpt",
    editable: true,
  },
  {
    key: "blogGap",
    label: "Gap",
    description: "Spacing between cards.",
    type: "select",
    group: "layout-blog",
    options: [
      { value: "sm", label: "Small" },
      { value: "md", label: "Medium" },
      { value: "lg", label: "Large" },
    ],
    default: "md",
    editable: true,
  },

  // Layout — Post
  {
    key: "postContentWidth",
    label: "Content width",
    description: "Max-width of blog post body.",
    type: "select",
    group: "layout-post",
    options: [
      { value: "narrow", label: "Narrow (2xl)" },
      { value: "medium", label: "Medium (4xl)" },
      { value: "wide", label: "Wide (7xl)" },
    ],
    default: "narrow",
    editable: true,
    immediatePublish: true,
  },
  {
    key: "postSidebar",
    label: "Sidebar",
    description: "Sidebar position for blog posts.",
    type: "select",
    group: "layout-post",
    options: [
      { value: "none", label: "None" },
      { value: "left", label: "Left" },
      { value: "right", label: "Right" },
    ],
    default: "none",
    editable: true,
    immediatePublish: true,
  },

  // Layout — Page
  {
    key: "pageContentWidth",
    label: "Content width",
    description: "Max-width of static page body.",
    type: "select",
    group: "layout-page",
    options: [
      { value: "narrow", label: "Narrow (2xl)" },
      { value: "medium", label: "Medium (4xl)" },
      { value: "wide", label: "Wide (7xl)" },
    ],
    default: "narrow",
    editable: true,
    immediatePublish: true,
  },
  {
    key: "pageSidebar",
    label: "Sidebar",
    description: "Sidebar position for static pages.",
    type: "select",
    group: "layout-page",
    options: [
      { value: "none", label: "None" },
      { value: "left", label: "Left" },
      { value: "right", label: "Right" },
    ],
    default: "none",
    editable: true,
    immediatePublish: true,
  },

  // ── Hero Section ────────────────────────────────────────────────────────────
  {
    key: "heroEnabled",
    label: "Show hero section",
    description: "Display a full-width hero banner at the top of the homepage.",
    type: "toggle",
    isGate: true,
    group: "hero",
    groupLabel: "Hero Section",
    default: "false",
    editable: true,
    order: 1,
  },
  {
    key: "heroHeight",
    label: "Height",
    description: "Viewport height of the hero banner.",
    type: "select",
    group: "hero",
    options: [
      { value: "short", label: "Short  (40vh)" },
      { value: "medium", label: "Medium (60vh)" },
      { value: "tall", label: "Tall   (80vh)" },
      { value: "full", label: "Full screen (100vh)" },
    ],
    default: "medium",
    editable: true,
    order: 2,
  },
  {
    key: "heroImageUrl",
    label: "Background image",
    description: "Choose from the media library or paste a URL directly.",
    type: "media-url",
    group: "hero",
    default: "",
    editable: true,
    order: 3,
  },
  {
    key: "heroOverlayColor",
    label: "Overlay color",
    description: "Tint color for the text-legibility overlay — usually black or your brand color.",
    type: "color",
    group: "hero",
    default: "#000000",
    editable: true,
    order: 4,
  },
  {
    key: "heroOverlayStyle",
    label: "Overlay style",
    description: "Gradient fades from opaque to transparent for a cinematic look; Flat covers the whole image evenly.",
    type: "select",
    group: "hero",
    options: [
      { value: "gradient-up", label: "Gradient — fade from bottom (recommended)" },
      { value: "gradient-down", label: "Gradient — fade from top" },
      { value: "flat", label: "Flat — uniform tint" },
    ],
    default: "gradient-up",
    editable: true,
    order: 5,
  },
  {
    key: "heroOverlayOpacity",
    label: "Overlay opacity",
    description: "Higher values improve text legibility against busy images.",
    type: "range",
    group: "hero",
    min: 0,
    max: 90,
    step: 10,
    unit: "%",
    default: "60",
    editable: true,
    order: 6,
  },
  {
    key: "heroShowHeadline",
    label: "Show headline",
    type: "toggle",
    group: "hero",
    default: "true",
    editable: true,
    order: 7,
  },
  {
    key: "heroHeadline",
    label: "Headline text",
    type: "text",
    group: "hero",
    placeholder: "Welcome",
    default: "Welcome",
    editable: true,
    order: 8,
  },
  {
    key: "heroShowSubheadline",
    label: "Show subheadline",
    type: "toggle",
    group: "hero",
    default: "true",
    editable: true,
    order: 9,
  },
  {
    key: "heroSubheadline",
    label: "Subheadline text",
    type: "text",
    group: "hero",
    placeholder: "Thoughts, ideas, and deep dives.",
    default: "Thoughts, ideas, and deep dives.",
    editable: true,
    order: 10,
  },
  {
    key: "heroContentAlign",
    label: "Content alignment",
    description: "Horizontal alignment of the headline, subheadline, and buttons.",
    type: "select",
    group: "hero",
    options: [
      { value: "left", label: "Left" },
      { value: "center", label: "Center" },
    ],
    default: "center",
    editable: true,
    order: 11,
  },
  {
    key: "heroContentPosition",
    label: "Content position",
    description: "Vertical position of the content block within the hero.",
    type: "select",
    group: "hero",
    options: [
      { value: "top", label: "Top" },
      { value: "center", label: "Center" },
      { value: "bottom", label: "Bottom" },
    ],
    default: "bottom",
    editable: true,
    order: 12,
  },
  {
    key: "heroCta1Enabled",
    label: "Show button 1",
    type: "toggle",
    group: "hero",
    default: "false",
    editable: true,
    order: 13,
  },
  {
    key: "heroCta1Text",
    label: "Button 1 — label",
    type: "text",
    group: "hero",
    placeholder: "Get started",
    default: "Get started",
    editable: true,
    order: 14,
  },
  {
    key: "heroCta1Url",
    label: "Button 1 — URL",
    type: "url",
    group: "hero",
    placeholder: "/",
    default: "/",
    editable: true,
    order: 15,
  },
  {
    key: "heroCta1Style",
    label: "Button 1 — style",
    type: "select",
    group: "hero",
    options: [
      { value: "filled", label: "Filled (white background)" },
      { value: "outline", label: "Outline (ghost)" },
    ],
    default: "filled",
    editable: true,
    order: 16,
  },
  {
    key: "heroCta2Enabled",
    label: "Show button 2",
    type: "toggle",
    group: "hero",
    default: "false",
    editable: true,
    order: 17,
  },
  {
    key: "heroCta2Text",
    label: "Button 2 — label",
    type: "text",
    group: "hero",
    placeholder: "Learn more",
    default: "Learn more",
    editable: true,
    order: 18,
  },
  {
    key: "heroCta2Url",
    label: "Button 2 — URL",
    type: "url",
    group: "hero",
    placeholder: "/about",
    default: "/about",
    editable: true,
    order: 19,
  },
  {
    key: "heroCta2Style",
    label: "Button 2 — style",
    type: "select",
    group: "hero",
    options: [
      { value: "filled", label: "Filled (white background)" },
      { value: "outline", label: "Outline (ghost)" },
    ],
    default: "outline",
    editable: true,
    order: 20,
  },
];

// ─── Color presets ────────────────────────────────────────────────────────────
// Named snapshots of the 8 color tokens. Selecting one populates the draft
// fields — it does not auto-publish. Themes may export their own preset list.

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: "light",
    label: "Light",
    colors: {
      colorBackground: "#ffffff",
      colorSurface:    "#f8fafc",
      colorForeground: "#0f172a",
      colorMuted:      "#334155", // darkened from #64748b — was 4.8:1, now 10.4:1 on white
      colorBorder:     "#e2e8f0",
      colorAccent:     "#2563eb",
      colorAccentFg:   "#ffffff",
      colorLink:       "#2563eb",
    },
  },
  {
    id: "dark",
    label: "Dark",
    colors: {
      colorBackground: "#09090b",
      colorSurface:    "#18181b",
      colorForeground: "#fafafa",
      colorMuted:      "#ababba", // lightened from #a1a1aa — was 7.75:1, now 8.77:1 on #09090b
      colorBorder:     "#27272a",
      colorAccent:     "#6366f1",
      colorAccentFg:   "#ffffff",
      colorLink:       "#818cf8",
    },
  },
  {
    id: "paper",
    label: "Paper",
    colors: {
      colorBackground: "#faf7f2",
      colorSurface:    "#f5f0e8",
      colorForeground: "#2c2416",
      colorMuted:      "#4a3e2c", // darkened from #7a6b52 — was 4.85:1, now 9.74:1 on #faf7f2
      colorBorder:     "#e5d9c5",
      colorAccent:     "#b45309",
      colorAccentFg:   "#ffffff",
      colorLink:       "#92400e",
    },
  },
  {
    id: "slate",
    label: "Slate",
    colors: {
      colorBackground: "#f1f5f9",
      colorSurface:    "#e2e8f0",
      colorForeground: "#0f172a",
      colorMuted:      "#334155", // darkened from #475569 — was 6.9:1, now 9.48:1 on #f1f5f9
      colorBorder:     "#cbd5e1",
      colorAccent:     "#0f172a",
      colorAccentFg:   "#ffffff",
      colorLink:       "#1e40af",
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    colors: {
      colorBackground: "#f0f9ff",
      colorSurface:    "#e0f2fe",
      colorForeground: "#0c4a6e",
      colorMuted:      "#08497a", // darkened from #0369a1 — was 5.6:1, now 8.78:1 on #f0f9ff
      colorBorder:     "#bae6fd",
      colorAccent:     "#0284c7",
      colorAccentFg:   "#ffffff",
      colorLink:       "#0369a1",
    },
  },
  {
    id: "midnight",
    label: "Midnight",
    colors: {
      colorBackground: "#0f172a",
      colorSurface:    "#1e293b",
      colorForeground: "#f1f5f9",
      colorMuted:      "#a8b8cc", // lightened from #94a3b8 — was 7.0:1, now 8.84:1 on #0f172a
      colorBorder:     "#334155",
      colorAccent:     "#818cf8",
      colorAccentFg:   "#ffffff",
      colorLink:       "#a5b4fc",
    },
  },
];

// ─── Defaults map ─────────────────────────────────────────────────────────────
// Convenience: a flat key→value map of all token defaults.

export const DESIGN_DEFAULTS: Record<string, string> = Object.fromEntries(
  DESIGN_TOKEN_DEFS.map((t) => [t.key, t.default])
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds a safe Google Fonts URL from the active design config.
 * Validates that each font is in the SANS_FONTS / MONO_FONTS allowlist.
 * Returns null if all active fonts are system fonts (no network request needed).
 */
export function buildGoogleFontsUrl(config: Record<string, string>): string | null {
  const fontSans = config.fontSans ?? DESIGN_DEFAULTS.fontSans;
  const fontMono = config.fontMono ?? DESIGN_DEFAULTS.fontMono;

  const families: string[] = [];

  if (SANS_FONTS.includes(fontSans) && !SYSTEM_FONTS.includes(fontSans)) {
    families.push(`family=${encodeURIComponent(fontSans)}:wght@400;500;600;700`);
  }

  if (MONO_FONTS.includes(fontMono) && !SYSTEM_FONTS.includes(fontMono)) {
    families.push(`family=${encodeURIComponent(fontMono)}:wght@400;500`);
  }

  if (families.length === 0) return null;

  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

/**
 * Builds a :root { ... } CSS string from the active design config.
 * Only emits tokens that have a cssVariable defined.
 * Appends prose overrides and body defaults.
 */
export function buildCssString(
  config: Record<string, string>,
  tokenDefs: DesignTokenDef[]
): string {
  const lines: string[] = [];

  for (const def of tokenDefs) {
    if (!def.cssVariable) continue;

    const value = config[def.key] ?? def.default;

    if (def.type === "google-font") {
      // Apply appropriate system-font fallback stack based on the font list.
      const fallback = def.fontList === "mono"
        ? `'Fira Code', monospace`
        : `system-ui, -apple-system, sans-serif`;
      lines.push(`  ${def.cssVariable}: '${value}', ${fallback};`);
    } else {
      lines.push(`  ${def.cssVariable}: ${value};`);
    }
  }

  return `:root {\n${lines.join("\n")}\n}\n/* prose overrides so article text respects design tokens */\n.prose { color: var(--color-foreground); font-size: var(--font-size-base); }\n.prose a { color: var(--color-link) !important; }\n.prose h1, .prose h2, .prose h3, .prose h4 { color: var(--color-foreground); }\nbody { font-family: var(--font-sans); font-size: var(--font-size-base); background-color: var(--color-background); color: var(--color-foreground); }`;
}

