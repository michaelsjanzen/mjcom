import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import Link from "next/link";
import type { ArticleLayoutConfig } from "../design";

function safeJson(obj: object): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export interface Breadcrumb {
  title: string;
  slug: string;
}

export interface PageViewProps {
  title: string;
  content: string;
  breadcrumbs: Breadcrumb[]; // ancestors from root to immediate parent (not including current)
  layoutConfig?: ArticleLayoutConfig;
  siblingPages?: { title: string; slug: string }[];
  /** Rendered widget area for the sidebar slot — replaces the default sibling/parent sidebar. */
  sidebarContent?: React.ReactNode;
  canonicalUrl?: string;
  /** Plugin slot: rendered inside the article, above the body content. */
  articleHeaderContent?: React.ReactNode;
  /** Plugin slot: rendered inside the article, after the body content and before the back link. */
  articleFooterContent?: React.ReactNode;
  /** Widget area rendered below the article, outside the content width constraint. */
  footerWidgets?: React.ReactNode;
  /** Optional taxonomy/date. If any are present they render at the bottom of the page,
      in the same order as single posts: categories → date → tags. */
  categories?: { name: string; slug: string }[];
  tags?: { name: string; slug: string }[];
  publishedAt?: Date | null;
  /** Featured image URL. When set, rendered between the page header and body. */
  featuredImageUrl?: string | null;
  /** Alt text for the featured image (defaults to the page title when omitted). */
  featuredImageAlt?: string | null;
}

function formatDate(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

const contentWidthClass: Record<string, string> = {
  narrow: "max-w-2xl mx-auto",
  medium: "max-w-4xl mx-auto",
  wide: "max-w-7xl mx-auto",
};

/**
 * Remove a leading `# Heading` line from markdown content if it matches the
 * page title (case-insensitive). PageView renders its own styled <h1>, so a
 * matching heading at the start of the content would produce a duplicate.
 */
function stripLeadingTitleHeading(content: string, title: string): string {
  return content.replace(/^#[ \t]+(.+?)[ \t]*(\r?\n|$)/, (match, heading) =>
    heading.trim().toLowerCase() === title.trim().toLowerCase() ? "" : match
  );
}

export default function PageView({
  title,
  content,
  breadcrumbs,
  layoutConfig,
  siblingPages,
  sidebarContent,
  canonicalUrl,
  articleHeaderContent,
  articleFooterContent,
  footerWidgets,
  categories = [],
  tags = [],
  publishedAt = null,
  featuredImageUrl = null,
  featuredImageAlt = null,
}: PageViewProps) {
  const contentWidth = layoutConfig?.contentWidth ?? "narrow";
  const sidebar = layoutConfig?.sidebar ?? "none";
  const widthClass = contentWidthClass[contentWidth] ?? contentWidthClass.narrow;

  // ── JSON-LD ────────────────────────────────────────────────────────────────

  const webPageSchema = canonicalUrl
    ? safeJson({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        url: canonicalUrl,
      })
    : null;

  // BreadcrumbList: Home → ...ancestors → current page
  // canonicalUrl is of the form https://example.com/post/[slug]; strip /post/[slug] to get the site root.
  const siteRoot = canonicalUrl ? canonicalUrl.replace(/\/post\/[^/]+$/, "") : "";

  const breadcrumbSchema = canonicalUrl && breadcrumbs.length > 0
    ? safeJson({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteRoot || "/" },
          ...breadcrumbs.map((crumb, i) => ({
            "@type": "ListItem",
            position: i + 2,
            name: crumb.title,
            item: `${siteRoot}/${crumb.slug}`,
          })),
          { "@type": "ListItem", position: breadcrumbs.length + 2, name: title, item: canonicalUrl },
        ],
      })
    : null;

  const pageBody = (
    <article className="space-y-10">
      {webPageSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: webPageSchema }} />
      )}
      {breadcrumbSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbSchema }} />
      )}
      {/* Breadcrumb */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-[var(--color-muted)] flex-wrap">
          <Link href="/" className="hover:text-[var(--color-foreground)] transition">Home</Link>
          {breadcrumbs.flatMap(crumb => [
            <span key={`sep-${crumb.slug}`} className="text-[var(--color-border)]">›</span>,
            <Link
              key={crumb.slug}
              href={`/${crumb.slug}`}
              className="hover:text-[var(--color-foreground)] transition"
            >
              {crumb.title}
            </Link>,
          ])}
          <span className="text-[var(--color-border)]">›</span>
          <span className="text-[var(--color-foreground)] font-medium">{title}</span>
        </nav>
      )}

      {/* Page header */}
      <header className="pb-8 border-b border-[var(--color-border)]">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-foreground)] leading-tight">
          {title}
        </h1>
      </header>

      {/* Featured image — rendered between header and body when set */}
      {featuredImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={featuredImageUrl}
          alt={featuredImageAlt ?? title}
          className="w-full h-auto rounded-lg"
        />
      )}

      {/* articleHeader slot — plugin content above the body */}
      {articleHeaderContent}

      {/* Page body */}
      <div className="prose max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-[var(--color-foreground)] prose-a:text-[var(--color-link)] prose-a:no-underline hover:prose-a:underline prose-code:text-[var(--color-foreground)] prose-code:bg-[var(--color-surface)] prose-code:px-1 prose-code:rounded prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-p:text-[var(--color-foreground)] prose-li:text-[var(--color-foreground)]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeSlug]}>
          {stripLeadingTitleHeading(content, title)}
        </ReactMarkdown>
      </div>

      {/* articleFooter slot — plugin content after body, before back link */}
      {articleFooterContent}

      {/* Page metadata — bottom of page, same order as single posts:
          1. Categories  2. Date  3. Tags. Only rendered when any are present
          (static pages typically have none). */}
      {(categories.length > 0 || formatDate(publishedAt) || tags.length > 0) && (
        <div className="space-y-3">
          {(categories.length > 0 || formatDate(publishedAt)) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map(cat => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-surface)] text-[var(--color-accent)] border border-[var(--color-border)] hover:opacity-80 transition"
                >
                  {cat.name}
                </Link>
              ))}
              {formatDate(publishedAt) && (
                <time
                  dateTime={publishedAt?.toISOString()}
                  className="text-xs text-[var(--color-muted)] ml-1"
                >
                  {formatDate(publishedAt)}
                </time>
              )}
            </div>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <Link
                  key={tag.slug}
                  href={`/tag/${tag.slug}`}
                  className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] hover:opacity-80 transition"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Back to parent or home */}
      <footer className="pt-2">
        {breadcrumbs.length > 0 ? (
          <Link
            href={`/${breadcrumbs[breadcrumbs.length - 1].slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {breadcrumbs[breadcrumbs.length - 1].title}
          </Link>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Home
          </Link>
        )}
      </footer>
    </article>
  );

  const hasDefaultSidebarContent =
    (siblingPages && siblingPages.length > 0) || breadcrumbs.length > 0;

  const defaultSidebar = hasDefaultSidebarContent ? (
    <div className="space-y-6">
      {siblingPages && siblingPages.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">
            In this section
          </h3>
          <div className="flex flex-col gap-1">
            {siblingPages.map(page => (
              <Link
                key={page.slug}
                href={`/${page.slug}`}
                className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] px-2 py-1 rounded-md hover:bg-[var(--color-surface)] transition"
              >
                {page.title}
              </Link>
            ))}
          </div>
        </div>
      )}
      {breadcrumbs.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">
            Parent
          </h3>
          <Link
            href={`/${breadcrumbs[breadcrumbs.length - 1].slug}`}
            className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] px-2 py-1 rounded-md hover:bg-[var(--color-surface)] transition block"
          >
            ← {breadcrumbs[breadcrumbs.length - 1].title}
          </Link>
        </div>
      )}
    </div>
  ) : null;

  const resolvedSidebarContent = sidebarContent ?? defaultSidebar;

  const layoutNode = (sidebar === "none" || !resolvedSidebarContent) ? (
    <div className={widthClass}>{pageBody}</div>
  ) : (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
      {sidebar === "left" && (
        <aside className="w-full lg:w-56 shrink-0 space-y-6 lg:sticky lg:top-24 order-last lg:order-first">{resolvedSidebarContent}</aside>
      )}
      <div className="flex-1 min-w-0 w-full">{pageBody}</div>
      {sidebar === "right" && (
        <aside className="w-full lg:w-56 shrink-0 space-y-6 lg:sticky lg:top-24 order-last">{resolvedSidebarContent}</aside>
      )}
    </div>
  );

  if (!footerWidgets) return layoutNode;

  return (
    <>
      {layoutNode}
      {footerWidgets}
    </>
  );
}
