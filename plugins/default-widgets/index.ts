// PUGMILL_PLUGIN: default-widgets
// ============================================================
// Provides the standard set of sidebar and post-footer widgets
// that ship with Pugmill out of the box. Demonstrating best
// practice: widgets are plugin-tier concerns, declared as
// data in the `widgets` array — no manual registerWidget() calls.
//
// To add a new widget:
//   1. Create the component in ./widgets/<name>.tsx
//   2. Import it here and add a WidgetDef entry to the widgets array.
// ============================================================

import type { PugmillPlugin } from "@/lib/plugin-registry";
import { tocWidget } from "./widgets/toc";
import { recentPostsWidget } from "./widgets/recent-posts";
import { relatedPostsWidget } from "./widgets/related-posts";
import { categoriesWidget } from "./widgets/categories";
import { siblingPagesWidget } from "./widgets/sibling-pages";
import { childPagesWidget } from "./widgets/child-pages";
import { aeoFaqWidget } from "./widgets/aeo-faq";

const POST_AREAS  = ["sidebar-post", "post-footer"] as const;
const PAGE_AREAS  = ["sidebar-page"] as const;
const BOTH_AREAS  = ["sidebar-post", "sidebar-page", "post-footer"] as const;
const ALL_AREAS   = ["sidebar-post", "sidebar-page", "post-footer", "page-footer"] as const;

export const defaultWidgetsPlugin: PugmillPlugin = {
  id: "default-widgets",
  name: "Default Widgets",
  version: "1.0.0",
  description: "Table of Contents, Recent Posts, Related Posts, Categories, Sibling Pages, Sub-pages, and FAQ.",

  widgets: [
    {
      id: "toc",
      label: "Table of Contents",
      description: "Auto-generated from headings in the content.",
      areas: [...BOTH_AREAS],
      component: tocWidget,
    },
    {
      id: "recent-posts",
      label: "Recent Posts",
      description: "A list of the most recently published posts.",
      areas: [...BOTH_AREAS],
      configSchema: {
        count: {
          type: "number",
          label: "Number of posts",
          default: "5",
          description: "How many recent posts to show (1–20).",
        },
      },
      component: recentPostsWidget,
    },
    {
      id: "related-posts",
      label: "Related Posts",
      description: "Posts sharing a category with the current post. Falls back to recent posts.",
      areas: [...POST_AREAS],
      configSchema: {
        count: {
          type: "number",
          label: "Number of posts",
          default: "4",
          description: "How many related posts to show (1–10).",
        },
      },
      component: relatedPostsWidget,
    },
    {
      id: "categories",
      label: "Categories",
      description: "All categories with post counts.",
      areas: [...POST_AREAS],
      component: categoriesWidget,
    },
    {
      id: "sibling-pages",
      label: "Sibling Pages",
      description: "Other pages in the same section (shared parent).",
      areas: [...PAGE_AREAS],
      component: siblingPagesWidget,
    },
    {
      id: "child-pages",
      label: "Sub-pages",
      description: "Child pages nested under this page.",
      areas: [...PAGE_AREAS],
      component: childPagesWidget,
    },
    {
      id: "aeo-faq",
      label: "FAQ",
      description: "Displays the Q&A pairs from a post or page's AEO metadata.",
      areas: [...ALL_AREAS],
      configSchema: {
        heading: {
          type: "text",
          label: "Heading",
          default: "Frequently Asked Questions",
          description: "Section heading shown above the FAQ. Leave blank to hide the heading.",
        },
        style: {
          type: "select",
          label: "Display style",
          default: "plain",
          description: "How Q&A pairs are presented.",
          options: [
            { value: "plain",     label: "Plain — question + answer always visible" },
            { value: "accordion", label: "Accordion — click to expand each answer" },
            { value: "numbered",  label: "Numbered — numbered list with visible answers" },
          ],
        },
      },
      component: aeoFaqWidget,
    },
  ],

  initialize(_hooks, _settings) {
    // No hook listeners needed — this plugin only provides widgets.
  },
};
