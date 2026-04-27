import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { WidgetContext } from "@/types/widget";

interface QaPair {
  q: string;
  a: string;
}

interface AeoMetadata {
  qa?: QaPair[];
}

// ── Plain style ───────────────────────────────────────────────────────────────

function PlainFaq({ heading, pairs }: { heading: string; pairs: QaPair[] }) {
  return (
    <section aria-label={heading}>
      {heading && (
        <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-3">
          {heading}
        </h3>
      )}
      <dl className="space-y-4">
        {pairs.map((item, i) => (
          <div key={i}>
            <dt className="text-sm font-medium text-[var(--color-foreground)] leading-snug">
              {item.q}
            </dt>
            <dd className="mt-1 text-sm text-[var(--color-muted)] leading-relaxed">
              {item.a}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// ── Numbered style ────────────────────────────────────────────────────────────

function NumberedFaq({ heading, pairs }: { heading: string; pairs: QaPair[] }) {
  return (
    <section aria-label={heading}>
      {heading && (
        <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-3">
          {heading}
        </h3>
      )}
      <ol className="space-y-4 list-none">
        {pairs.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span className="text-xs font-semibold text-[var(--color-accent)] mt-0.5 tabular-nums shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="text-sm font-medium text-[var(--color-foreground)] leading-snug">
                {item.q}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)] leading-relaxed">
                {item.a}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ── Accordion style ───────────────────────────────────────────────────────────
// Uses the native <details>/<summary> element — no JS required, accessible,
// works without hydration. Each item opens independently.

function AccordionFaq({ heading, pairs }: { heading: string; pairs: QaPair[] }) {
  return (
    <section aria-label={heading}>
      {heading && (
        <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-3">
          {heading}
        </h3>
      )}
      <div className="space-y-1 divide-y divide-[var(--color-border)]">
        {pairs.map((item, i) => (
          <details key={i} className="group py-3 first:pt-0">
            <summary className="flex items-center justify-between gap-3 cursor-pointer list-none select-none">
              <span className="text-sm font-medium text-[var(--color-foreground)] leading-snug">
                {item.q}
              </span>
              {/* Chevron rotates open via CSS sibling selector — no JS */}
              <svg
                className="w-4 h-4 shrink-0 text-[var(--color-muted)] transition-transform duration-200 group-open:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

// ── Widget component ──────────────────────────────────────────────────────────

export async function aeoFaqWidget(
  ctx: WidgetContext,
  settings: Record<string, string>
): Promise<React.ReactNode> {
  const row = await db
    .select({ aeoMetadata: posts.aeoMetadata })
    .from(posts)
    .where(eq(posts.id, ctx.postId))
    .limit(1);

  const meta = row[0]?.aeoMetadata as AeoMetadata | null;
  const pairs = meta?.qa?.filter(p => p.q?.trim() && p.a?.trim()) ?? [];

  if (pairs.length === 0) return null;

  const style   = (settings.style ?? "plain") as "plain" | "accordion" | "numbered";
  const heading = settings.heading ?? "Frequently Asked Questions";

  if (style === "accordion") return <AccordionFaq heading={heading} pairs={pairs} />;
  if (style === "numbered")  return <NumberedFaq  heading={heading} pairs={pairs} />;
  return <PlainFaq heading={heading} pairs={pairs} />;
}
