import { db } from "@/lib/db";
import { posts, postCategories, postTags, categories, tags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getConfig } from "@/lib/config";
import { sanitizeThemeName } from "@/lib/theme-registry";
import { getDesignConfig } from "@/lib/design-config";
import { getThemePostView, getThemePageView } from "@/lib/theme-modules";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import type { Breadcrumb } from "../../../../../themes/default/views/PageView";
import type { ArticleLayoutConfig } from "../../../../../themes/default/design";
import { parseAeoMetadata } from "@/lib/aeo";
import { getActiveSlots } from "@/lib/plugin-registry";
import { hooks } from "@/lib/hooks";
import type { PostPayload } from "@/lib/hook-catalogue";
import WidgetArea from "@/components/widgets/WidgetArea";
import { getWidgetAreaAssignment } from "@/lib/actions/widgets";
import type { WidgetContext } from "@/types/widget";
import { resolveSiteUrl, toAbsoluteUrl } from "@/lib/site-url";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildDescription(post: { excerpt: string | null; content: string }): string {
  if (post.excerpt) return post.excerpt;
  return post.content
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*{1,2}(.+?)\*{1,2}/g, "$1")
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 160);
}

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

// ─── Dynamic metadata ─────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const [post, config] = await Promise.all([
    db.query.posts.findFirst({ where: eq(posts.slug, slug) }),
    getConfig(),
  ]);

  if (!post || !post.published) return { title: "Not found" };

  const aeoMeta = parseAeoMetadata(post.aeoMetadata);
  const siteUrl = resolveSiteUrl(
    process.env.NEXTAUTH_URL ?? "http://localhost:3000",
    config.site?.url ?? "",
  );
  const siteName = config.site?.name ?? "Pugmill";
  const description = buildDescription(post);
  const canonicalUrl = (post.canonicalUrl && post.canonicalUrl.trim())
    ? post.canonicalUrl
    : `${siteUrl}/post/${post.slug}`;

  const featuredMedia = post.featuredImage
    ? await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, post.featuredImage!) })
    : null;
  const featuredImageUrl = featuredMedia ? toAbsoluteUrl(featuredMedia.url, siteUrl) : null;
  const ogImage =
    toAbsoluteUrl(post.ogImageUrl, siteUrl) ??
    featuredImageUrl ??
    toAbsoluteUrl(config.site.seoDefaults?.ogImage, siteUrl) ??
    undefined;
  const metaDescription = description || config.site.seoDefaults?.metaDescription || undefined;

  const seoTitle = post.seoTitle;
  const seoMetaDescription = post.seoMetaDescription;
  const imageAlt = featuredMedia?.altText ?? post.title;

  const robotsDirectives: string[] = [];
  if (post.robotsNoindex) robotsDirectives.push("noindex");
  if (post.robotsNofollow) robotsDirectives.push("nofollow");

  return {
    title: seoTitle ? { absolute: seoTitle } : post.title,
    description: seoMetaDescription ?? metaDescription,
    ...(robotsDirectives.length ? { robots: robotsDirectives.join(", ") } : {}),
    keywords: aeoMeta?.keywords?.length ? aeoMeta.keywords : undefined,
    alternates: {
      canonical: canonicalUrl,
      types: {
        "text/markdown": `${canonicalUrl}/llm.txt`,
        "application/json": `${canonicalUrl}/data.json`,
      },
    },
    openGraph: {
      type: "article",
      title: seoTitle ?? post.title,
      description: seoMetaDescription ?? metaDescription,
      url: canonicalUrl,
      siteName,
      ...(ogImage ? { images: [{ url: ogImage, alt: imageAlt }] } : {}),
      publishedTime: (post.publishedAt ?? post.createdAt).toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: seoTitle ?? post.title,
      description: seoMetaDescription ?? metaDescription,
      ...(ogImage ? { images: [{ url: ogImage, alt: imageAlt }] } : {}),
    },
  };
}

// ─── Widget helpers ───────────────────────────────────────────────────────────

async function widgetArea(
  areaId: string,
  ctx: WidgetContext,
): Promise<React.ReactNode> {
  const ids = await getWidgetAreaAssignment(areaId);
  if (ids.length === 0) return undefined;
  return await WidgetArea({ widgetIds: ids, context: ctx }) ?? undefined;
}

// ─── Page component ───────────────────────────────────────────────────────────

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await db.query.posts.findFirst({ where: eq(posts.slug, slug) });
  if (!post || !post.published) notFound();

  const aeo = parseAeoMetadata(post.aeoMetadata);

  // Resolve design config for layout
  const [config, cookieStore] = await Promise.all([getConfig(), cookies()]);
  const siteUrl = resolveSiteUrl(
    process.env.NEXTAUTH_URL ?? "http://localhost:3000",
    config.site?.url ?? "",
  );
  const canonicalUrl = `${siteUrl}/post/${post.slug}`;
  const activeTheme = sanitizeThemeName(config.appearance.activeTheme);
  const isPreview = cookieStore.get("__pugmill_design_preview")?.value === "1";
  const designConfig = await getDesignConfig(activeTheme, isPreview ? "draft" : "published");

  const postLayoutConfig: ArticleLayoutConfig = {
    contentWidth: (designConfig.postContentWidth as "narrow" | "medium" | "wide") ?? "medium",
    sidebar: (designConfig.postSidebar as "none" | "left" | "right") ?? "none",
  };
  const pageLayoutConfig: ArticleLayoutConfig = {
    contentWidth: (designConfig.pageContentWidth as "narrow" | "medium" | "wide") ?? "medium",
    sidebar: (designConfig.pageSidebar as "none" | "left" | "right") ?? "none",
  };

  // Build the minimal hook payload (PostPayload is the hook contract — not the full DB row)
  const postPayload: PostPayload = {
    id: post.id,
    slug: post.slug,
    title: post.title,
    type: post.type as "post" | "page",
    published: post.published,
    authorId: post.authorId,
    parentId: post.parentId,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    aeoMetadata: post.aeoMetadata ?? undefined,
  };

  // Run content through registered plugin filters before handing to the theme view
  const filteredContent = await hooks.applyFilters("content:render", { input: post.content, post: postPayload });

  // Slot props and active slot components — resolved once, used in both page and post branches.
  const slotProps = { postId: post.id, postSlug: post.slug, postType: post.type as "post" | "page" };
  const articleHeaderSlots = getActiveSlots("articleHeader", config.modules.activePlugins, config.modules.pluginSettings);
  const articleFooterSlots = getActiveSlots("articleFooter", config.modules.activePlugins, config.modules.pluginSettings);
  const postFooterSlots    = getActiveSlots("postFooter",    config.modules.activePlugins, config.modules.pluginSettings);

  if (post.type === "page") {
    // Hierarchical page — use PageView with breadcrumbs
    const breadcrumbs = await resolveBreadcrumbs(post.parentId);
    const PageView = getThemePageView(activeTheme);

    // Fetch featured image for the page (parallel with sibling fetch below)
    const pageFeaturedMedia = post.featuredImage
      ? await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, post.featuredImage!) })
      : null;
    const pageFeaturedUrl = pageFeaturedMedia?.url ?? null;
    const pageFeaturedAlt = pageFeaturedMedia?.altText ?? null;

    // Fetch sibling pages (same parent, type=page, published) for sidebar navigation
    let siblingPages: { title: string; slug: string }[] = [];
    if (pageLayoutConfig.sidebar !== "none" && post.parentId !== null) {
      const parentId = post.parentId; // narrowed: non-null by condition above
      const siblings = await db.query.posts.findMany({
        where: (p, { and: a, eq: e, ne }) =>
          a(e(p.parentId, parentId), e(p.type, "page"), e(p.published, true), ne(p.id, post.id)),
      });
      siblingPages = siblings.map(s => ({ title: s.title, slug: s.slug }));
    }

    const pageWidgetCtx: WidgetContext = {
      type: "page",
      postId: post.id,
      slug: post.slug,
      content: post.content,
      categoryIds: [],
      tagIds: [],
      parentId: post.parentId,
      designConfig,
    };
    const [pageSidebar, pageFooterWidgets] = await Promise.all([
      pageLayoutConfig.sidebar !== "none"
        ? widgetArea("sidebar-page", pageWidgetCtx)
        : Promise.resolve(undefined),
      widgetArea("page-footer", pageWidgetCtx),
    ]);

    return (
      <>
        <PageView
          title={post.title}
          content={filteredContent}
          breadcrumbs={breadcrumbs}
          layoutConfig={pageLayoutConfig}
          siblingPages={siblingPages}
          sidebarContent={pageSidebar}
          canonicalUrl={canonicalUrl}
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

  // Blog post — use PostView with taxonomy + AEO FAQ
  const [postCats, postTagsList, featuredMedia] = await Promise.all([
    db.select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(postCategories)
      .innerJoin(categories, eq(categories.id, postCategories.categoryId))
      .where(eq(postCategories.postId, post.id)),
    db.select({ id: tags.id, name: tags.name, slug: tags.slug })
      .from(postTags)
      .innerJoin(tags, eq(tags.id, postTags.tagId))
      .where(eq(postTags.postId, post.id)),
    post.featuredImage
      ? db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, post.featuredImage!) })
      : Promise.resolve(null),
  ]);

  const featuredImageUrl = featuredMedia?.url ?? null;
  const filteredExcerpt = post.excerpt
    ? await hooks.applyFilters("content:excerpt", { input: post.excerpt, post: postPayload })
    : post.excerpt;
  const PostView = getThemePostView(activeTheme);

  const postWidgetCtx: WidgetContext = {
    type: "post",
    postId: post.id,
    slug: post.slug,
    content: post.content,
    categoryIds: postCats.map(c => c.id),
    tagIds: postTagsList.map(t => t.id),
    parentId: post.parentId,
    designConfig,
  };

  const [postSidebar, postFooterWidgets] = await Promise.all([
    postLayoutConfig.sidebar !== "none"
      ? widgetArea("sidebar-post", postWidgetCtx)
      : Promise.resolve(undefined),
    widgetArea("post-footer", postWidgetCtx),
  ]);

  return (
    <>
      <PostView
        title={post.title}
        excerpt={filteredExcerpt}
        content={filteredContent}
        publishedAt={post.publishedAt}
        updatedAt={post.updatedAt}
        featuredImageUrl={featuredImageUrl}
        categories={postCats}
        tags={postTagsList}
        aeoMetadata={aeo}
        layoutConfig={postLayoutConfig}
        canonicalUrl={canonicalUrl}
        siteName={config.site?.name ?? "Pugmill"}
        sidebarContent={postSidebar}
        footerWidgets={postFooterWidgets}
        articleHeaderContent={articleHeaderSlots.map(({ pluginId, Component }) => (
          <Component key={pluginId} {...slotProps} />
        ))}
        articleFooterContent={articleFooterSlots.map(({ pluginId, Component }) => (
          <Component key={pluginId} {...slotProps} />
        ))}
      />
      {postFooterSlots.map(({ pluginId, Component }) => (
        <Component key={pluginId} {...slotProps} />
      ))}
    </>
  );
}
