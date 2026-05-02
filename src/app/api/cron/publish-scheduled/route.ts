import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auditLog } from "@/lib/audit-log";
import { checkApiRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/cron/publish-scheduled
 *
 * Publishes any posts/pages whose publishedAt timestamp has passed
 * but whose published flag is still false (i.e. they were scheduled).
 *
 * Secured with a Bearer token matching CRON_SECRET.
 *
 * Trigger this from any HTTP scheduler — system cron, cron-job.org,
 * GitHub Actions, an external uptime service, etc.:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://yoursite.com/api/cron/publish-scheduled
 *
 * Recommended schedule: every 5 minutes.
 */
export async function GET(req: NextRequest) {
  const limited = checkApiRateLimit(req);
  if (limited) return limited;

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Do not reveal env var state — treat missing secret same as wrong token.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const authBuf = Buffer.from(auth);
  const expectedBuf = Buffer.from(expected);
  const valid =
    authBuf.length === expectedBuf.length &&
    timingSafeEqual(authBuf, expectedBuf);
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all posts that are scheduled but not yet published
  const due = await db
    .select({ id: posts.id, slug: posts.slug, type: posts.type })
    .from(posts)
    .where(
      and(
        eq(posts.published, false),
        isNotNull(posts.publishedAt),
        lte(posts.publishedAt, now)
      )
    );

  if (due.length === 0) {
    return NextResponse.json({ published: 0 });
  }

  const ids = due.map(p => p.id);

  // Publish all due posts in a single update
  await db
    .update(posts)
    .set({ published: true, updatedAt: now } as Partial<typeof posts.$inferInsert>)
    .where(
      and(
        eq(posts.published, false),
        isNotNull(posts.publishedAt),
        lte(posts.publishedAt, now)
      )
    );

  // Revalidate listing and each individual post
  revalidatePath("/admin/posts");
  revalidatePath("/");
  for (const post of due) {
    revalidatePath(`/${post.type === "page" ? post.slug : `blog/${post.slug}`}`);
  }

  auditLog({
    action: "post.publish_scheduled",
    detail: `Published ${due.length} scheduled post(s): ${ids.join(", ")}`,
  });

  console.log(`[CronJob] publish-scheduled: published ${due.length} post(s) — IDs: ${ids.join(", ")}`);

  return NextResponse.json({ published: due.length, ids });
}
