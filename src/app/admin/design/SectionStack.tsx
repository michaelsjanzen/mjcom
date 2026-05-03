"use client";

import { useState, useTransition, useCallback, useRef, lazy, Suspense } from "react";
const SectionHeroCanvas = lazy(() => import("./SectionHeroCanvas"));
import type {
  HomepageSection,
  HeroSection,
  PostFeedSection,
  TextBlockSection,
  CtaSection,
  FeaturedPostSection,
  SectionType,
} from "@/types/homepage-sections";
import {
  serializeHomepageSections,
  SECTION_LABELS,
  defaultSection,
} from "@/lib/homepage-sections";
import { useDesignSave } from "./DesignSaveContext";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MediaItem { id: number; url: string; fileName: string; }
interface CategoryItem { slug: string; name: string; }
interface PostItem { id: number; title: string; }

interface Props {
  initialSections: HomepageSection[];
  saveAction: (partial: Record<string, string>) => Promise<void>;
  allMedia: MediaItem[];
  categories: CategoryItem[];
  recentPosts: PostItem[];
}

// ─── Pill button helper ────────────────────────────────────────────────────────

function PillButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
        active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-medium text-zinc-700">{children}</span>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-zinc-500 mt-0.5">{children}</p>;
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4">{children}</div>;
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {hint && <Hint>{hint}</Hint>}
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 resize-y"
    />
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        // Both states need to stay visible against light AND dark card
        // backgrounds. The previous "off" state used bg-zinc-200 which
        // was nearly invisible on Design > Homepage in dark mode. Adding
        // an inset ring + dark-mode override ensures the track is always
        // visible. "On" uses violet for clear affordance in both modes.
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ring-1 ring-inset ${
          checked
            ? "bg-violet-600 ring-violet-700"
            : "bg-zinc-200 ring-zinc-300 dark:bg-zinc-600 dark:ring-zinc-500"
        }`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`} />
      </button>
      <span className="text-sm text-zinc-700 dark:text-zinc-200">{label}</span>
    </label>
  );
}

// ─── Per-section forms ─────────────────────────────────────────────────────────


function PostFeedForm({
  section, onChange, categories,
}: { section: PostFeedSection; onChange: (s: PostFeedSection) => void; categories: CategoryItem[] }) {
  const u = <K extends keyof PostFeedSection>(key: K, val: PostFeedSection[K]) =>
    onChange({ ...section, [key]: val });

  return (
    <div className="space-y-5">
      {/* Heading */}
      <FieldGroup label="Section heading" hint="Optional heading displayed above the feed.">
        <TextInput value={section.heading} onChange={v => u("heading", v)} placeholder="Latest posts" />
      </FieldGroup>

      {/* Category filter */}
      <FieldGroup label="Category filter" hint="Only show posts from this category. Leave blank for all posts.">
        <select
          value={section.categorySlug}
          onChange={e => u("categorySlug", e.target.value)}
          className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
        >
          <option value="">All posts</option>
          {categories.map(c => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </FieldGroup>

      {/* Feed style */}
      <Row>
        <div><Label>Feed style</Label></div>
        <div className="flex gap-1 shrink-0">
          {(["list", "grid"] as const).map(s => (
            <PillButton key={s} active={section.feedStyle === s} onClick={() => u("feedStyle", s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </PillButton>
          ))}
        </div>
      </Row>

      {/* List style (list mode only) */}
      {section.feedStyle === "list" && (
        <Row>
          <div><Label>List style</Label></div>
          <div className="flex gap-1 shrink-0 flex-wrap justify-end">
            {(["compact", "editorial", "feature", "text-only"] as const).map(s => (
              <PillButton key={s} active={section.listStyle === s} onClick={() => u("listStyle", s)}>
                {s === "text-only" ? "Text only" : s.charAt(0).toUpperCase() + s.slice(1)}
              </PillButton>
            ))}
          </div>
        </Row>
      )}

      {/* Grid columns (grid mode only) */}
      {section.feedStyle === "grid" && (
        <Row>
          <div><Label>Columns</Label></div>
          <div className="flex gap-1 shrink-0">
            {(["1", "2", "3"] as const).map(c => (
              <PillButton key={c} active={section.columns === c} onClick={() => u("columns", c)}>
                {c}
              </PillButton>
            ))}
          </div>
        </Row>
      )}

      {/* Gap */}
      <Row>
        <div><Label>Gap</Label></div>
        <div className="flex gap-1 shrink-0">
          {([["sm", "S"], ["md", "M"], ["lg", "L"]] as const).map(([val, label]) => (
            <PillButton key={val} active={section.gap === val} onClick={() => u("gap", val)}>
              {label}
            </PillButton>
          ))}
        </div>
      </Row>

      {/* Content display */}
      <Row>
        <div><Label>Preview text</Label></div>
        <div className="flex gap-1 shrink-0">
          {(["excerpt", "none"] as const).map(v => (
            <PillButton key={v} active={section.contentDisplay === v} onClick={() => u("contentDisplay", v)}>
              {v === "excerpt" ? "Excerpt" : "None"}
            </PillButton>
          ))}
        </div>
      </Row>

      {/* Limit */}
      <FieldGroup label="Post limit" hint="Maximum posts to show. 0 = default page size (10).">
        <input
          type="number" min={0} max={50} step={1}
          value={section.limit}
          onChange={e => u("limit", Number(e.target.value))}
          className="w-24 text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
        />
      </FieldGroup>

      {/* Pagination */}
      <Toggle
        checked={section.showPagination}
        onChange={v => u("showPagination", v)}
        label="Show pagination"
      />
    </div>
  );
}

function TextBlockForm({
  section, onChange,
}: { section: TextBlockSection; onChange: (s: TextBlockSection) => void }) {
  const u = <K extends keyof TextBlockSection>(key: K, val: TextBlockSection[K]) =>
    onChange({ ...section, [key]: val });

  return (
    <div className="space-y-5">
      <FieldGroup label="Content" hint="Supports basic HTML (paragraphs, headings, bold, links).">
        <TextArea value={section.content} onChange={v => u("content", v)} rows={6} placeholder="<p>Your text here…</p>" />
      </FieldGroup>

      <Row>
        <div><Label>Max width</Label></div>
        <div className="flex gap-1 shrink-0">
          {(["narrow", "medium", "wide", "full"] as const).map(w => (
            <PillButton key={w} active={section.maxWidth === w} onClick={() => u("maxWidth", w)}>
              {w.charAt(0).toUpperCase() + w.slice(1)}
            </PillButton>
          ))}
        </div>
      </Row>

      <Row>
        <div><Label>Alignment</Label></div>
        <div className="flex gap-1 shrink-0">
          {(["left", "center"] as const).map(a => (
            <PillButton key={a} active={section.align === a} onClick={() => u("align", a)}>
              {a.charAt(0).toUpperCase() + a.slice(1)}
            </PillButton>
          ))}
        </div>
      </Row>
    </div>
  );
}

function CtaForm({
  section, onChange,
}: { section: CtaSection; onChange: (s: CtaSection) => void }) {
  const u = <K extends keyof CtaSection>(key: K, val: CtaSection[K]) =>
    onChange({ ...section, [key]: val });

  return (
    <div className="space-y-5">
      <FieldGroup label="Heading">
        <TextInput value={section.heading} onChange={v => u("heading", v)} placeholder="Ready to get started?" />
      </FieldGroup>
      <FieldGroup label="Subtext">
        <TextInput value={section.subtext} onChange={v => u("subtext", v)} placeholder="A short supporting message." />
      </FieldGroup>
      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label="Button label">
          <TextInput value={section.buttonText} onChange={v => u("buttonText", v)} placeholder="Learn more" />
        </FieldGroup>
        <FieldGroup label="Button URL">
          <TextInput value={section.buttonUrl} onChange={v => u("buttonUrl", v)} placeholder="/page" />
        </FieldGroup>
      </div>

      <Row>
        <div><Label>Alignment</Label></div>
        <div className="flex gap-1 shrink-0">
          {(["left", "center"] as const).map(a => (
            <PillButton key={a} active={section.align === a} onClick={() => u("align", a)}>
              {a.charAt(0).toUpperCase() + a.slice(1)}
            </PillButton>
          ))}
        </div>
      </Row>

      <Row>
        <div><Label>Style</Label></div>
        <div className="flex gap-1 shrink-0">
          {(["filled", "subtle", "outline"] as const).map(s => (
            <PillButton key={s} active={section.style === s} onClick={() => u("style", s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </PillButton>
          ))}
        </div>
      </Row>
    </div>
  );
}

function FeaturedPostForm({
  section, onChange, recentPosts,
}: { section: FeaturedPostSection; onChange: (s: FeaturedPostSection) => void; recentPosts: PostItem[] }) {
  const u = <K extends keyof FeaturedPostSection>(key: K, val: FeaturedPostSection[K]) =>
    onChange({ ...section, [key]: val });

  return (
    <div className="space-y-5">
      <FieldGroup label="Post" hint="Auto uses the site's pinned featured post. Choose a specific post to pin one here.">
        <select
          value={section.postId === "auto" ? "auto" : String(section.postId)}
          onChange={e => u("postId", e.target.value === "auto" ? "auto" : Number(e.target.value))}
          className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
        >
          <option value="auto">Auto (site featured post)</option>
          {recentPosts.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </FieldGroup>

      <Toggle
        checked={section.showExcerpt}
        onChange={v => u("showExcerpt", v)}
        label="Show excerpt"
      />
    </div>
  );
}

// ─── Section card ──────────────────────────────────────────────────────────────

function SectionCard({
  section,
  index,
  total,
  onMove,
  onDelete,
  onUpdate,
  onToggleEnabled,
  allMedia,
  categories,
  recentPosts,
}: {
  section: HomepageSection;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onDelete: (index: number) => void;
  onUpdate: (index: number, updated: HomepageSection) => void;
  onToggleEnabled: (index: number) => void;
  allMedia: MediaItem[];
  categories: CategoryItem[];
  recentPosts: PostItem[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`border rounded-lg bg-white overflow-hidden transition-colors ${
      section.enabled ? "border-zinc-200" : "border-zinc-100 opacity-60"
    }`}>
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Enabled toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={section.enabled}
          onClick={() => onToggleEnabled(index)}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
            section.enabled ? "bg-zinc-900" : "bg-zinc-200"
          }`}
        >
          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
            section.enabled ? "translate-x-4" : "translate-x-0.5"
          }`} />
        </button>

        {/* Label */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex-1 text-left text-sm font-medium text-zinc-800 hover:text-zinc-900"
        >
          {SECTION_LABELS[section.type]}
          {section.type === "post-feed" && (section as PostFeedSection).heading
            ? ` — ${(section as PostFeedSection).heading}`
            : ""}
        </button>

        {/* Reorder */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onMove(index, index - 1)}
            disabled={index === 0}
            className="p-1 rounded text-zinc-400 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Move up"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onMove(index, index + 1)}
            disabled={index === total - 1}
            className="p-1 rounded text-zinc-400 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Move down"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Expand/collapse */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="p-1 rounded text-zinc-400 hover:text-zinc-700"
          aria-label={open ? "Collapse" : "Expand"}
        >
          <svg
            className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={() => {
            if (confirm(`Remove this ${SECTION_LABELS[section.type]} section?`)) {
              onDelete(index);
            }
          }}
          className="p-1 rounded text-zinc-300 hover:text-red-500 transition-colors"
          aria-label="Remove section"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Form body */}
      {open && (
        <div className="border-t border-zinc-100 px-5 py-5">
          {section.type === "hero" && (
            <Suspense fallback={<div className="h-48 animate-pulse bg-zinc-100 rounded-xl" />}>
              <SectionHeroCanvas
                section={section as HeroSection}
                onChange={s => onUpdate(index, s)}
                allMedia={allMedia}
              />
            </Suspense>
          )}
          {section.type === "post-feed" && (
            <PostFeedForm
              section={section as PostFeedSection}
              onChange={s => onUpdate(index, s)}
              categories={categories}
            />
          )}
          {section.type === "text-block" && (
            <TextBlockForm
              section={section as TextBlockSection}
              onChange={s => onUpdate(index, s)}
            />
          )}
          {section.type === "cta" && (
            <CtaForm
              section={section as CtaSection}
              onChange={s => onUpdate(index, s)}
            />
          )}
          {section.type === "featured-post" && (
            <FeaturedPostForm
              section={section as FeaturedPostSection}
              onChange={s => onUpdate(index, s)}
              recentPosts={recentPosts}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

const ADDABLE_TYPES: SectionType[] = [
  "hero", "post-feed", "featured-post", "text-block", "cta",
];

export default function SectionStack({
  initialSections,
  saveAction,
  allMedia,
  categories,
  recentPosts,
}: Props) {
  const [sections, setSections] = useState<HomepageSection[]>(initialSections);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [, startTransition] = useTransition();
  const { setIsSaving } = useDesignSave();

  // Debounce timer ref
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback((next: HomepageSection[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setIsSaving(true);
    saveTimer.current = setTimeout(() => {
      startTransition(async () => {
        await saveAction({ homepageSections: serializeHomepageSections(next) });
        setIsSaving(false);
      });
    }, 800);
  }, [saveAction, setIsSaving]);

  function update(next: HomepageSection[]) {
    setSections(next);
    persist(next);
  }

  function handleMove(from: number, to: number) {
    if (to < 0 || to >= sections.length) return;
    const next = [...sections];
    [next[from], next[to]] = [next[to], next[from]];
    update(next);
  }

  function handleDelete(index: number) {
    update(sections.filter((_, i) => i !== index));
  }

  function handleUpdate(index: number, updated: HomepageSection) {
    const next = sections.map((s, i) => (i === index ? updated : s));
    update(next);
  }

  function handleToggleEnabled(index: number) {
    const next = sections.map((s, i) =>
      i === index ? { ...s, enabled: !s.enabled } : s
    );
    update(next);
  }

  function handleAdd(type: SectionType) {
    update([...sections, defaultSection(type)]);
    setShowAddMenu(false);
  }

  return (
    <div className="space-y-3">
      {sections.length === 0 && (
        <p className="text-sm text-zinc-500 py-4 text-center">No sections yet. Add one below.</p>
      )}

      {sections.map((section, i) => (
        <SectionCard
          key={section.id}
          section={section}
          index={i}
          total={sections.length}
          onMove={handleMove}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          onToggleEnabled={handleToggleEnabled}
          allMedia={allMedia}
          categories={categories}
          recentPosts={recentPosts}
        />
      ))}

      {/* Add section */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowAddMenu(v => !v)}
          className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-800 border border-dashed border-zinc-300 hover:border-zinc-400 rounded-lg px-4 py-3 w-full justify-center transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add section
        </button>

        {showAddMenu && (
          <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden z-10">
            {ADDABLE_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => handleAdd(type)}
                className="w-full text-left px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                {SECTION_LABELS[type]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
