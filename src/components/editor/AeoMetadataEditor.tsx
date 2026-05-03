"use client";
import { useState, forwardRef, useImperativeHandle, useRef } from "react";

export type ExtendedSchemaType = "HowTo" | "Product" | "Event" | "LocalBusiness" | "VideoObject" | "Review";

export interface AeoMetadata {
  summary?: string;
  questions?: { q: string; a: string }[];
  entities?: { type: string; name: string; description?: string; sameAs?: string }[];
  keywords?: string[];
  schemaType?: ExtendedSchemaType;
  schemaData?: Record<string, string>;
  /** When true, the Q&A pairs are still emitted to JSON-LD FAQPage and
   *  /llms.txt for AI / search-engine consumption, but the visible FAQ
   *  widget skips this post. */
  hideQaFromReaders?: boolean;
}

// Per-type field definitions: [fieldKey, label, placeholder, isTextarea?]
const SCHEMA_FIELDS: Record<ExtendedSchemaType, [string, string, string, boolean?][]> = {
  Review: [
    ["itemType", "Item type", "Book, Movie, Product, Restaurant, Software, etc."],
    ["itemName", "Item name", "The name of the thing being reviewed"],
    ["itemAuthor", "Item author / creator", "Author, director, or brand (optional)"],
    ["ratingValue", "Rating", "4"],
    ["bestRating", "Best possible rating", "5"],
    ["reviewBody", "Review body", "Your full review text...", true],
  ],
  HowTo: [
    ["name", "Name", "How to bake sourdough bread"],
    ["totalTime", "Total time", "PT1H30M (ISO 8601 duration, e.g. PT1H for 1 hour)"],
    ["description", "Description", "Brief overview of what this guide covers"],
    ["steps", "Steps (one per line)", "Mix flour and water\nAdd starter and salt\nKnead for 10 minutes", true],
  ],
  Product: [
    ["name", "Product name", "Pugmill CMS"],
    ["description", "Description", "A self-hosted CMS built for content teams"],
    ["brand", "Brand", "Pugmill"],
    ["price", "Price", "0"],
    ["priceCurrency", "Currency", "USD"],
    ["availability", "Availability", "InStock"],
  ],
  Event: [
    ["name", "Event name", "Annual Content Summit 2025"],
    ["startDate", "Start date", "2025-09-01T09:00"],
    ["endDate", "End date", "2025-09-01T17:00"],
    ["locationName", "Location name", "San Francisco Convention Center"],
    ["description", "Description", "Brief description of the event"],
  ],
  LocalBusiness: [
    ["name", "Business name", "Acme Pottery Studio"],
    ["businessType", "Business type", "LocalBusiness (or ProfessionalService, Restaurant, etc.)"],
    ["address", "Address", "123 Main St, Portland, OR 97201"],
    ["telephone", "Phone", "+1-555-123-4567"],
    ["url", "Website", "https://example.com"],
  ],
  VideoObject: [
    ["name", "Video title", "Getting started with Pugmill CMS"],
    ["description", "Description", "A walkthrough of the Pugmill CMS setup process"],
    ["contentUrl", "Video URL", "https://example.com/video.mp4"],
    ["thumbnailUrl", "Thumbnail URL", "https://example.com/thumb.jpg"],
    ["uploadDate", "Upload date", "2025-01-15"],
    ["duration", "Duration", "PT4M30S (ISO 8601, e.g. PT4M30S for 4m30s)"],
  ],
};

export interface AeoMetadataEditorHandle {
  setValue: (value: AeoMetadata) => void;
}

interface Props {
  name: string;
  defaultValue?: AeoMetadata | null;
  onChange?: (value: AeoMetadata) => void;
}

const AeoMetadataEditor = forwardRef<AeoMetadataEditorHandle, Props>(function AeoMetadataEditor(
  { name, defaultValue, onChange },
  ref
) {
  const [summary, setSummary] = useState(defaultValue?.summary ?? "");
  const [questions, setQuestions] = useState<{ q: string; a: string }[]>(
    defaultValue?.questions ?? []
  );
  const [entities, setEntities] = useState<{ type: string; name: string; description?: string; sameAs?: string }[]>(
    defaultValue?.entities ?? []
  );
  const [keywords, setKeywords] = useState<string[]>(defaultValue?.keywords ?? []);
  const [kwInput, setKwInput] = useState("");
  const kwInputRef = useRef<HTMLInputElement>(null);
  const [schemaType, setSchemaType] = useState<ExtendedSchemaType | "">(defaultValue?.schemaType ?? "");
  const [schemaData, setSchemaData] = useState<Record<string, string>>(defaultValue?.schemaData ?? {});
  const [hideQaFromReaders, setHideQaFromReaders] = useState<boolean>(defaultValue?.hideQaFromReaders ?? false);

  function buildValue(
    s: string,
    qs: { q: string; a: string }[],
    es: { type: string; name: string; description?: string; sameAs?: string }[],
    kws: string[],
    st: ExtendedSchemaType | "",
    sd: Record<string, string>,
    hideQa: boolean = false,
  ): AeoMetadata {
    return {
      ...(s ? { summary: s } : {}),
      ...(qs.filter(q => q.q && q.a).length > 0 ? { questions: qs.filter(q => q.q && q.a) } : {}),
      ...(es.filter(e => e.name).length > 0 ? { entities: es.filter(e => e.name).map(e => ({
        type: e.type,
        name: e.name,
        ...(e.description ? { description: e.description } : {}),
        ...(e.sameAs ? { sameAs: e.sameAs } : {}),
      })) } : {}),
      ...(kws.length > 0 ? { keywords: kws } : {}),
      ...(st ? { schemaType: st, schemaData: sd } : {}),
      ...(hideQa ? { hideQaFromReaders: true } : {}),
    };
  }

  useImperativeHandle(ref, () => ({
    setValue(aeo: AeoMetadata) {
      const s = aeo.summary ?? "";
      const qs = aeo.questions ?? [];
      const es = aeo.entities ?? [];
      const kws = (aeo.keywords ?? []).slice(0, 10);
      const st = aeo.schemaType ?? "";
      const sd = aeo.schemaData ?? {};
      const hideQa = aeo.hideQaFromReaders ?? false;
      setSummary(s);
      setQuestions(qs);
      setEntities(es);
      setKeywords(kws);
      setSchemaType(st);
      setSchemaData(sd);
      setHideQaFromReaders(hideQa);
      onChange?.(buildValue(s, qs, es, kws, st, sd, hideQa));
    },
  }));

  const value = buildValue(summary, questions, entities, keywords, schemaType, schemaData, hideQaFromReaders);

  return (
    <div className="space-y-5">
      <p className="text-xs text-zinc-500 leading-relaxed">
        AEO metadata helps AI engines (ChatGPT, Perplexity, Gemini) understand and cite this page
        accurately. Exposed at{" "}
        <code className="bg-zinc-100 px-1 rounded">/llms.txt</code> and in the REST API.
      </p>

      <input
        type="hidden"
        name={name}
        value={Object.keys(value).length > 0 ? JSON.stringify(value) : ""}
      />

      {/* Summary */}
      <div>
        <label className="block text-sm font-medium text-zinc-700">Summary</label>
        <p className="text-xs text-zinc-400 mb-1.5">One paragraph for AI crawlers.</p>
        <textarea
          value={summary}
          onChange={e => {
            const s = e.target.value;
            setSummary(s);
            onChange?.(buildValue(s, questions, entities, keywords, schemaType, schemaData));
          }}
          rows={3}
          placeholder="A concise description of this page for AI systems..."
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      </div>

      {/* Q&A Pairs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <label className="text-sm font-medium text-zinc-700">Q&amp;A Pairs</label>
            <p className="text-xs text-zinc-400">Questions your content answers.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = [...questions, { q: "", a: "" }];
              setQuestions(next);
              onChange?.(buildValue(summary, next, entities, keywords, schemaType, schemaData));
            }}
            className="text-xs text-zinc-500 hover:text-zinc-900 border border-zinc-200 rounded px-2 py-1 transition-colors"
          >
            + Add question
          </button>
        </div>
        <div className="space-y-3">
          {questions.map((qa, i) => (
            <div key={i} className="border border-zinc-200 rounded-lg p-3 bg-white space-y-2">
              <input
                value={qa.q}
                onChange={e => {
                  const next = [...questions];
                  next[i] = { ...next[i], q: e.target.value };
                  setQuestions(next);
                  onChange?.(buildValue(summary, next, entities, keywords, schemaType, schemaData));
                }}
                placeholder="Question"
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              <textarea
                value={qa.a}
                onChange={e => {
                  const next = [...questions];
                  next[i] = { ...next[i], a: e.target.value };
                  setQuestions(next);
                  onChange?.(buildValue(summary, next, entities, keywords, schemaType, schemaData));
                }}
                placeholder="Answer"
                rows={2}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              <button
                type="button"
                onClick={() => {
                  const next = questions.filter((_, j) => j !== i);
                  setQuestions(next);
                  onChange?.(buildValue(summary, next, entities, keywords, schemaType, schemaData));
                }}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
          {questions.length === 0 && (
            <p className="text-xs text-zinc-400 italic py-1">No Q&amp;A pairs yet.</p>
          )}
        </div>

        {/* Per-post visibility control: hide the rendered FAQ widget while
            keeping the Q&A in JSON-LD FAQPage and /llms.txt for AI / search. */}
        {questions.length > 0 && (
          <label className="flex items-start gap-2 mt-3 pt-3 border-t border-zinc-100 cursor-pointer">
            <input
              type="checkbox"
              checked={hideQaFromReaders}
              onChange={e => {
                const next = e.target.checked;
                setHideQaFromReaders(next);
                onChange?.(buildValue(summary, questions, entities, keywords, schemaType, schemaData, next));
              }}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-700 focus:ring-zinc-400 cursor-pointer"
            />
            <span className="text-xs text-zinc-600 leading-relaxed">
              <span className="font-medium">Hide Q&amp;A from readers on this page.</span>{" "}
              <span className="text-zinc-400">
                The pairs above stay in JSON-LD FAQPage and <code className="bg-zinc-100 px-1 rounded">/llms.txt</code> so AI engines and crawlers still see them. Only the visible FAQ widget skips this post.
              </span>
            </span>
          </label>
        )}
      </div>

      {/* Named Entities */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <label className="text-sm font-medium text-zinc-700">Named Entities</label>
            <p className="text-xs text-zinc-400">Key concepts, people, or products.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = [...entities, { type: "Thing", name: "", description: "", sameAs: "" }];
              setEntities(next);
              onChange?.(buildValue(summary, questions, next, keywords, schemaType, schemaData));
            }}
            className="text-xs text-zinc-500 hover:text-zinc-900 border border-zinc-200 rounded px-2 py-1 transition-colors"
          >
            + Add entity
          </button>
        </div>
        <div className="space-y-3">
          {entities.map((entity, i) => (
            <div key={i} className="border border-zinc-200 rounded-lg p-3 bg-white space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={entity.name}
                  onChange={e => {
                    const next = [...entities];
                    next[i] = { ...next[i], name: e.target.value };
                    setEntities(next);
                    onChange?.(buildValue(summary, questions, next, keywords, schemaType, schemaData));
                  }}
                  placeholder="Name (e.g. Pugmill CMS)"
                  className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
                <select
                  value={entity.type}
                  onChange={e => {
                    const next = [...entities];
                    next[i] = { ...next[i], type: e.target.value };
                    setEntities(next);
                    onChange?.(buildValue(summary, questions, next, keywords, schemaType, schemaData));
                  }}
                  className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  {["Thing", "Person", "Organization", "Product", "Place", "Event", "Technology"].map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <input
                value={entity.description ?? ""}
                onChange={e => {
                  const next = [...entities];
                  next[i] = { ...next[i], description: e.target.value };
                  setEntities(next);
                  onChange?.(buildValue(summary, questions, next, keywords, schemaType, schemaData));
                }}
                placeholder="Short description (optional)"
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              <input
                value={entity.sameAs ?? ""}
                onChange={e => {
                  const next = [...entities];
                  next[i] = { ...next[i], sameAs: e.target.value };
                  setEntities(next);
                  onChange?.(buildValue(summary, questions, next, keywords, schemaType, schemaData));
                }}
                placeholder="Wikidata or Wikipedia URL (optional)"
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              <button
                type="button"
                onClick={() => {
                  const next = entities.filter((_, j) => j !== i);
                  setEntities(next);
                  onChange?.(buildValue(summary, questions, next, keywords, schemaType, schemaData));
                }}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
          {entities.length === 0 && (
            <p className="text-xs text-zinc-400 italic py-1">No entities yet.</p>
          )}
        </div>
      </div>

      {/* Keywords */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Keywords</label>
              {keywords.length >= 5 ? (
                <svg className="w-3.5 h-3.5 text-green-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className="text-xs text-zinc-400">{keywords.length}/10</span>
              )}
            </div>
            <p className="text-xs text-zinc-400">5–10 specific, search-focused terms.</p>
          </div>
          <span />
        </div>

        {/* Tag pills */}
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {keywords.map((kw, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-700 text-xs px-2 py-0.5 rounded-full">
                {kw}
                <button
                  type="button"
                  onClick={() => {
                    const next = keywords.filter((_, j) => j !== i);
                    setKeywords(next);
                    onChange?.(buildValue(summary, questions, entities, next, schemaType, schemaData));
                  }}
                  className="text-zinc-400 hover:text-zinc-700 transition-colors leading-none"
                  aria-label={`Remove ${kw}`}
                >×</button>
              </span>
            ))}
          </div>
        )}

        {/* Input */}
        {keywords.length < 10 ? (
          <>
            <div className="flex gap-2">
              <input
                ref={kwInputRef}
                type="text"
                value={kwInput}
                onChange={e => setKwInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const trimmed = kwInput.trim().replace(/,$/, "");
                    if (trimmed && !keywords.includes(trimmed) && keywords.length < 10) {
                      const next = [...keywords, trimmed];
                      setKeywords(next);
                      onChange?.(buildValue(summary, questions, entities, next, schemaType, schemaData));
                    }
                    setKwInput("");
                  } else if (e.key === "Backspace" && kwInput === "" && keywords.length > 0) {
                    const next = keywords.slice(0, -1);
                    setKeywords(next);
                    onChange?.(buildValue(summary, questions, entities, next, schemaType, schemaData));
                  }
                }}
                placeholder="Type a keyword and press Enter"
                className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = kwInput.trim();
                  if (trimmed && !keywords.includes(trimmed) && keywords.length < 10) {
                    const next = [...keywords, trimmed];
                    setKeywords(next);
                    onChange?.(buildValue(summary, questions, entities, next, schemaType, schemaData));
                  }
                  setKwInput("");
                  kwInputRef.current?.focus();
                }}
                className="px-3 py-2 text-xs border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">Press Enter or comma to add. Backspace removes the last keyword.</p>
          </>
        ) : (
          <p className="text-xs text-zinc-400">10 keyword limit reached — remove one to add another.</p>
        )}
      </div>

      {/* Extended Schema Type */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <label className="text-sm font-medium text-zinc-700">Extended Schema</label>
            <p className="text-xs text-zinc-400">Additional JSON-LD type for this post.</p>
          </div>
        </div>
        <select
          value={schemaType}
          onChange={e => {
            const st = e.target.value as ExtendedSchemaType | "";
            setSchemaType(st);
            setSchemaData({});
            onChange?.(buildValue(summary, questions, entities, keywords, st, {}));
          }}
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
        >
          <option value="">— none —</option>
          {(["HowTo", "Product", "Event", "LocalBusiness", "VideoObject", "Review"] as ExtendedSchemaType[]).map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {schemaType && (
          <div className="mt-3 space-y-2 border border-zinc-100 rounded-lg p-3 bg-zinc-50">
            {SCHEMA_FIELDS[schemaType].map(([key, label, placeholder, isTextarea]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-zinc-500 mb-1">{label}</label>
                {isTextarea ? (
                  <textarea
                    value={schemaData[key] ?? ""}
                    onChange={e => {
                      const next = { ...schemaData, [key]: e.target.value };
                      setSchemaData(next);
                      onChange?.(buildValue(summary, questions, entities, keywords, schemaType, next));
                    }}
                    rows={4}
                    placeholder={placeholder}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white resize-y focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                ) : (
                  <input
                    value={schemaData[key] ?? ""}
                    onChange={e => {
                      const next = { ...schemaData, [key]: e.target.value };
                      setSchemaData(next);
                      onChange?.(buildValue(summary, questions, entities, keywords, schemaType, next));
                    }}
                    placeholder={placeholder}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default AeoMetadataEditor;
