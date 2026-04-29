import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit Post" };

import { db } from "@/lib/db";
import { posts, categories, tags, postCategories, postTags, media } from "@/lib/db/schema";
import { eq, like, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updatePost } from "@/lib/actions/posts";
import { isAiConfigured } from "@/lib/ai";
import type { AeoMetadata } from "@/components/editor/AeoMetadataEditor";
import PostForm from "@/components/editor/PostForm";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = parseInt(id);

  let post, allCategories, allTags, allPages, currentCategories, currentTags, aiEnabled, allMedia;
  try {
    [post, allCategories, allTags, allPages, currentCategories, currentTags, aiEnabled, allMedia] = await Promise.all([
      db.query.posts.findFirst({ where: eq(posts.id, postId) }),
      db.select().from(categories).orderBy(categories.name),
      db.select().from(tags).orderBy(tags.name),
      db.select({ id: posts.id, title: posts.title })
        .from(posts)
        .where(eq(posts.type, "page"))
        .orderBy(posts.title),
      db.select().from(postCategories).where(eq(postCategories.postId, postId)),
      db.select().from(postTags).where(eq(postTags.postId, postId)),
      isAiConfigured(),
      db.select({ id: media.id, url: media.url, fileName: media.fileName, altText: media.altText })
        .from(media)
        .where(like(media.fileType, "image/%"))
        .orderBy(desc(media.createdAt)),
    ]);
  } catch (err) {
    console.error(`[EditPostPage id=${postId}] Data fetch error:`, err);
    throw err;
  }

  if (!post) notFound();

  const selectedCategoryIds = currentCategories.map(pc => pc.categoryId);
  const selectedTagIds = currentTags.map(pt => pt.tagId);

  const pad = (n: number) => String(n).padStart(2, "0");
  const defaultPublishAt = post.publishedAt
    ? `${post.publishedAt.getFullYear()}-${pad(post.publishedAt.getMonth() + 1)}-${pad(post.publishedAt.getDate())}T${pad(post.publishedAt.getHours())}:${pad(post.publishedAt.getMinutes())}`
    : "";

  const featuredMediaRecord = post.featuredImage
    ? allMedia.find(m => m.id === post.featuredImage) ?? null
    : null;

  return (
    <PostForm
      mode="edit"
      postId={post.id}
      action={updatePost.bind(null, post.id)}
      aiEnabled={aiEnabled}
      initialTitle={post.title}
      initialSlug={post.slug}
      initialContent={post.content}
      initialExcerpt={post.excerpt ?? ""}
      initialType={post.type === "page" ? "page" : "post"}
      initialParentId={post.parentId}
      initialAeoMetadata={post.aeoMetadata as AeoMetadata | null}
      initialPublishAt={defaultPublishAt}
      allCategories={allCategories}
      allTags={allTags}
      allPages={allPages.filter(p => p.id !== postId)}
      initialCategoryIds={selectedCategoryIds}
      initialTagIds={selectedTagIds}
      allMedia={allMedia}
      initialFeaturedImageId={post.featuredImage ?? null}
      initialFeaturedImageUrl={featuredMediaRecord?.url ?? null}
      initialFeatured={post.featured}
      initialSeoTitle={post.seoTitle ?? ""}
      initialSeoMetaDescription={post.seoMetaDescription ?? ""}
      initialRobotsNoindex={post.robotsNoindex}
      initialRobotsNofollow={post.robotsNofollow}
      initialCanonicalUrl={post.canonicalUrl ?? ""}
      initialOgImageUrl={post.ogImageUrl ?? ""}
    />
  );
}
