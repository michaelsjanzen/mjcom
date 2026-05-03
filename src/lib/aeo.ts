import { z } from "zod";

/**
 * Zod schema for AEO (Answer Engine Optimisation) metadata stored in the
 * aeo_metadata JSONB column. Single source of truth used by:
 *   - Server actions (write path validation)
 *   - Site pages, llms.txt routes (read path validation)
 */
export const EXTENDED_SCHEMA_TYPES = ["HowTo", "Product", "Event", "LocalBusiness", "VideoObject", "Review"] as const;
export type ExtendedSchemaType = typeof EXTENDED_SCHEMA_TYPES[number];

export const aeoSchema = z.object({
  summary: z.string().max(2000).optional(),
  questions: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  entities: z.array(z.object({
    type: z.string(),
    name: z.string(),
    description: z.string().optional(),
    sameAs: z.string().url().optional(),
  })).optional(),
  keywords: z.array(z.string()).max(10).optional(),
  // Extended JSON-LD schema type and its field data
  schemaType: z.enum(EXTENDED_SCHEMA_TYPES).optional(),
  schemaData: z.record(z.string()).optional(),
  // When true, the Q&A pairs are still emitted to JSON-LD FAQPage and
  // /llms.txt (so AI / search engines see them), but the visible FAQ
  // widget skips this post. Useful when Q&A is structured for crawlers
  // but considered redundant or off-tone for human readers.
  hideQaFromReaders: z.boolean().optional(),
}).optional();

export type AeoMetadata = NonNullable<z.infer<typeof aeoSchema>>;

/**
 * Extract external citations from Markdown content.
 * Matches [text](url) links (not images) and returns unique external URLs.
 */
export function extractCitations(markdown: string): { url: string; name: string }[] {
  // Negative lookbehind excludes image syntax ![alt](url)
  const pattern = /(?<!!)\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  const seen = new Set<string>();
  const citations: { url: string; name: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markdown)) !== null) {
    const [, name, url] = match;
    if (!seen.has(url)) {
      seen.add(url);
      citations.push({ url, name });
    }
  }
  return citations;
}

/**
 * Compute a 0–3 AEO completeness score for a post.
 * Criteria: summary filled (1), at least one Q&A pair (1), at least one entity (1).
 */
export function calcAeoScore(aeo: AeoMetadata | null): { score: number; dots: boolean[] } {
  if (!aeo) return { score: 0, dots: [false, false, false] };
  const hasSummary  = !!aeo.summary?.trim();
  const hasQa       = (aeo.questions ?? []).some(q => q.q && q.a);
  const hasEntities = (aeo.entities  ?? []).some(e => e.name);
  const dots = [hasSummary, hasQa, hasEntities];
  return { score: dots.filter(Boolean).length, dots };
}

/**
 * Safely parse the aeo_metadata JSONB value from the database.
 * If strict schema validation fails, attempts a lenient partial parse so that
 * valid fields (summary, questions, entities) still contribute to the AEO score
 * even if one field (e.g. an over-length keyword) would otherwise fail.
 */
export function parseAeoMetadata(raw: unknown): AeoMetadata | null {
  if (raw == null) return null;
  const value = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  const result = aeoSchema.safeParse(value);
  if (result.success && result.data != null) return result.data;
  // Fallback: lenient partial parse — extract known-good fields individually
  const v = value as Record<string, unknown>;
  const partial: AeoMetadata = {};
  if (typeof v.summary === "string") partial.summary = v.summary.slice(0, 2000);
  if (Array.isArray(v.questions)) {
    const qs = (v.questions as unknown[]).filter(
      (q): q is { q: string; a: string } =>
        typeof (q as Record<string, unknown>).q === "string" &&
        typeof (q as Record<string, unknown>).a === "string",
    );
    if (qs.length > 0) partial.questions = qs;
  }
  if (Array.isArray(v.entities)) {
    const es = (v.entities as unknown[])
      .filter((e): e is Record<string, unknown> => typeof (e as Record<string, unknown>).name === "string")
      .map(e => ({
        type: typeof e.type === "string" ? e.type : "Thing",
        name: e.name as string,
        ...(typeof e.description === "string" ? { description: e.description } : {}),
        ...(typeof e.sameAs === "string" ? { sameAs: e.sameAs } : {}),
      }));
    if (es.length > 0) partial.entities = es as AeoMetadata["entities"];
  }
  if (Array.isArray(v.keywords)) {
    const kws = (v.keywords as unknown[]).filter((k): k is string => typeof k === "string").slice(0, 10);
    if (kws.length > 0) partial.keywords = kws;
  }
  if (typeof v.schemaType === "string" && (EXTENDED_SCHEMA_TYPES as readonly string[]).includes(v.schemaType)) {
    partial.schemaType = v.schemaType as ExtendedSchemaType;
  }
  if (v.schemaData && typeof v.schemaData === "object" && !Array.isArray(v.schemaData)) {
    const sd: Record<string, string> = {};
    for (const [k, val] of Object.entries(v.schemaData)) {
      if (typeof val === "string") sd[k] = val;
    }
    if (Object.keys(sd).length > 0) partial.schemaData = sd;
  }
  return Object.keys(partial).length > 0 ? partial : null;
}
