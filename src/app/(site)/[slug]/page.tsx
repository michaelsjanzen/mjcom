import { db } from "@/lib/db";
import { posts, postCategories, postTags, categories, tags } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getConfig } from "@/lib/config";
import { sanitizeThemeName } from "@/lib/theme-registry";
import { getDesignConfig } from "@/lib/design-config";
import { getThemePageView } from "@/lib/theme-modules";
import { cookies } from "next/headers";
import { hooks } from "@/lib/hooks";
import type { PostPayload } from "@/lib/hook-catalogue";
import type { ArticleLayoutConfig } from "../../../../themes/default/design";
import type { Metadata } from "next";
import WidgetArea from "@/components/widgets/WidgetArea";
import { getWidgetAreaAssignment } from "@/lib/actions/widgets";
import type { WidgetContext } from "@/types/widget";
import type { Breadcrumb } from "../../../../themes/default/views/PageView";
import { resolveSiteUrl, toAbsoluteUrl } from "@/lib/site-url";
import { getActiveSlots } from "@/lib/plugin-registry";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Walk the parentId chain to build breadcrumbs from root → immediate parent. */
async function resolveBreadcrumbs(parentId: number | null): Promise<Breadcrumb[]> {
  const crumbs: Breadcrumb[] = [];
  let id = parentId;
  while (id !== null) {
    const ancestor = await db.query.posts.findFirst({ where: eq(posts.id, id) });
    if (!ancestor) break;
    crumbs.unshift({ title: ancestor.title, slug: ancestor.slug });
    id = ancestor.parentId;
  }
  return crumbs;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const [page, config] = await Promise.all([
    db.query.posts.findFirst({
      where: and(eq(posts.slug, slug), eq(posts.type, "page"), eq(posts.published, true)),
    }),
    getConfig(),
  ]);

  const siteName = config.site?.name ?? "Pugmill";
  if (!page) return { title: "Not found" };

  const siteUrl = resolveSiteUrl(
    process.env.NEXTAUTH_URL ?? "http://localhost:3000",
    config.site?.url ?? "",
  );
  const seoTitle = page.seoTitle;
  const seoMetaDescription = page.seoMetaDescription;
  const defaultDescription = page.excerpt ?? config.site.seoDefaults?.metaDescription ?? undefined;
  const canonicalUrl = (page.canonicalUrl && page.canonicalUrl.trim())
    ? page.canonicalUrl
    : `${siteUrl}/${page.slug}`;
  const ogImage =
    toAbsoluteUrl(page.ogImageUrl, siteUrl) ??
    toAbsoluteUrl(config.site.seoDefaults?.ogImage, siteUrl) ??
    undefined;

  const robotsDirectives: string[] = [];
  if (page.robotsNoindex) robotsDirectives.push("noindex");
  if (page.robotsNofollow) robotsDirectives.push("nofollow");

  return {
    title: seoTitle ? { absolute: seoTitle } : page.title,
    description: seoMetaDescription ?? defaultDescription,
    ...(robotsDirectives.length ? { robots: robotsDirectives.join(", ") } : {}),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: seoTitle ?? page.title,
      description: seoMetaDescription ?? defaultDescription,
      url: canonicalUrl,
      ...(ogImage ? { images: [{ url: ogImage, alt: page.title }] } : {}),
    },
  };
}

// ─── Page component ───────────────────────────────────────────────────────────

export default async function GenericPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const page = await db.query.posts.findFirst({
    where: and(eq(posts.slug, slug), eq(posts.type, "page"), eq(posts.published, true)),
  });

  if (!page) notFound();

  const [config, cookieStore] = await Promise.all([getConfig(), cookies()]);
  const activeTheme = sanitizeThemeName(config.appearance.activeTheme);
  const isPreview = cookieStore.get("__pugmill_design_preview")?.value === "1";
  const designConfig = await getDesignConfig(activeTheme, isPreview ? "draft" : "published");

  const layoutConfig: ArticleLayoutConfig = {
    contentWidth: (designConfig.pageContentWidth as "narrow" | "medium" | "wide") ?? "narrow",
    sidebar: (designConfig.pageSidebar as "none" | "left" | "right") ?? "none",
  };

  const postPayload: PostPayload = {
    id: page.id,
    slug: page.slug,
    title: page.title,
    type: "page",
    published: page.published,
    authorId: page.authorId,
    parentId: page.parentId,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };

  const [filteredContent, breadcrumbs, pageCategories, pageTags] = await Promise.all([
    hooks.applyFilters("content:render", { input: page.content, post: postPayload }),
    resolveBreadcrumbs(page.parentId),
    db
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(postCategories)
      .innerJoin(categories, eq(categories.id, postCategories.categoryId))
      .where(eq(postCategories.postId, page.id)),
    db
      .select({ id: tags.id, name: tags.name, slug: tags.slug })
      .from(postTags)
      .innerJoin(tags, eq(tags.id, postTags.tagId))
      .where(eq(postTags.postId, page.id)),
  ]);

  // Sibling pages for sidebar navigation (only relevant when there is a parent)
  let siblingPages: { title: string; slug: string }[] = [];
  if (layoutConfig.sidebar !== "none" && page.parentId !== null) {
    const siblings = await db
      .select({ title: posts.title, slug: posts.slug })
      .from(posts)
      .where(
        and(
          eq(posts.parentId, page.parentId),
          eq(posts.type, "page"),
          eq(posts.published, true),
          ne(posts.id, page.id),
        )
      );
    siblingPages = siblings;
  }

  const widgetCtx: WidgetContext = {
    type: "page",
    postId: page.id,
    slug: page.slug,
    content: page.content,
    categoryIds: pageCategories.map(c => c.id),
    tagIds: pageTags.map(t => t.id),
    parentId: page.parentId,
    designConfig,
  };

  let sidebarContent: React.ReactNode = undefined;
  if (layoutConfig.sidebar !== "none") {
    const ids = await getWidgetAreaAssignment("sidebar-page");
    if (ids.length > 0) {
      sidebarContent = await WidgetArea({ widgetIds: ids, context: widgetCtx }) ?? undefined;
    }
  }

  let pageFooterWidgets: React.ReactNode = undefined;
  const pageFooterIds = await getWidgetAreaAssignment("page-footer");
  if (pageFooterIds.length > 0) {
    pageFooterWidgets = await WidgetArea({ widgetIds: pageFooterIds, context: widgetCtx }) ?? undefined;
  }

  // Fetch featured image for the page (uses page.featuredImage column).
  const pageFeaturedMedia = page.featuredImage
    ? await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, page.featuredImage!) })
    : null;
  const pageFeaturedUrl = pageFeaturedMedia?.url ?? null;
  const pageFeaturedAlt = pageFeaturedMedia?.altText ?? null;

  const PageView = getThemePageView(activeTheme);
  const slotProps = { postId: page.id, postSlug: page.slug, postType: "page" as const };
  const articleHeaderSlots = getActiveSlots("articleHeader", config.modules.activePlugins, config.modules.pluginSettings);
  const articleFooterSlots = getActiveSlots("articleFooter", config.modules.activePlugins, config.modules.pluginSettings);
  const postFooterSlots    = getActiveSlots("postFooter",    config.modules.activePlugins, config.modules.pluginSettings);

  return (
    <>
      <PageView
        title={page.title}
        content={filteredContent}
        breadcrumbs={breadcrumbs}
        layoutConfig={layoutConfig}
        siblingPages={siblingPages}
        sidebarContent={sidebarContent}
        categories={pageCategories}
        tags={pageTags}
        publishedAt={page.publishedAt}
        featuredImageUrl={pageFeaturedUrl}
        featuredImageAlt={pageFeaturedAlt}
        articleHeaderContent={articleHeaderSlots.map(({ pluginId, Component }) => (
          <Component key={pluginId} {...slotProps} />
        ))}
        articleFooterContent={articleFooterSlots.map(({ pluginId, Component }) => (
          <Component key={pluginId} {...slotProps} />
        ))}
        footerWidgets={pageFooterWidgets}
      />
      {postFooterSlots.map(({ pluginId, Component }) => (
        <Component key={pluginId} {...slotProps} />
      ))}
    </>
  );
}
