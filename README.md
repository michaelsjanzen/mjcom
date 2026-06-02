# Pugmill CMS

**Want to skip ahead?** Scroll to the **Quick Start** section below for the install prompt.

Pugmill CMS is a full-stack, rebuildable content management system for developers working with AI agents. It owns its own frontend -- a modern React/Next.js presentation layer that ships as part of the CMS, not as an afterthought. It includes an admin dashboard, a Markdown-first editor with Visual/Raw toggle, hierarchical content types, a public REST API for external consumption, and per-post AI Engine Optimization (AEO) metadata served via `llms.txt` endpoints.

> **v0.1.0 Developer Preview.** Intended for developers working with AI agents in Claude Code, Cursor, Replit, or similar environments. Public APIs may shift before 1.0.

> **Platform testing:** Validated on **Replit** (one-command AI agent deploy). Testing on Cursor, Claude Code, and other AI-native environments is next on the roadmap — contributions and reports welcome.

---

## Philosophy

Pugmill CMS is built for a team of one human and one AI agent. The human sets direction, makes decisions, and owns outcomes. The AI agent contributes context, technical judgment, and execution.

This informs what belongs in the product. Functionality that an AI agent can handle as a one-off task does not belong in core. Core exists for things that run continuously, require deep integration, or establish trust boundaries. Everything else is either a plugin (persistent, optional, used by many installations) or agent-generated (one-time, written on demand).

**The scope filter:** If an AI agent can do something as a one-off task, it does not belong in core.

**Built-in vs enhanced:** Every feature works without an AI provider configured. Connecting one in Settings > AI adds generation, suggestion, and automation to those same features. The base layer is complete on its own; AI adds speed and intelligence.

The full decision framework is in [`PHILOSOPHY.md`](./PHILOSOPHY.md), the canonical reference for this repository.

---

## Capabilities

| Capability | Description |
|---|---|
| **AI-Native by Design** | Every layer of the project is built for the human-AI team: documentation structured as active briefings, community recipes that any Agent Skills-aware agent can install from a URL, and built-in skills that give agents just-in-time guidance for common tasks like creating and publishing extensions |
| **Agent Skills Integration** | Community recipes follow the [Agent Skills](https://agentskills.io) open standard — a compatible agent can install any recipe directly from a GitHub URL by reading its `RECIPE.md`. A built-in `create-pugmill-recipe` skill ships with the project to help agents package and publish new extensions |
| **AEO-Native** | Per-post AEO metadata (summaries, Q&A pairs, entities) served via `llms.txt` spec endpoints |
| **Integrated Frontend** | A first-class React/Next.js presentation layer -- swappable themes, server components, design token system. The frontend is yours to own, not escape from |
| **API-Capable** | REST API (`/api/posts`, `/api/categories`, `/api/tags`, `/api/media`) with CORS, pagination, and `{ data, meta }` envelopes for external frontends or native apps |
| **Markdown-First** | Tiptap editor with Visual/Raw Markdown toggle; content stored as Markdown |
| **Hierarchical Content** | Pages nest under parent pages with automatically generated breadcrumb navigation |
| **Plugin System** | Plugins register lifecycle hooks (`content:render`, `post:after-save`, etc.) via `HookManager` |
| **Theme System** | Three bundled themes (Default, Editorial, Mono) with a draft/publish design token workflow; colors, fonts, layout, and homepage sections editable in Admin > Design |
| **Storage Abstraction** | `LocalStorageProvider` (default) or `S3StorageProvider` (AWS S3, R2, DO Spaces, MinIO) |
| **SEO & Discovery** | `generateMetadata()`, XML sitemap, `/feed.xml` (RSS 2.0), Open Graph, Twitter Cards, per-post canonical URL and OG image overrides |
| **Bot Analytics** | Tracks AI crawler and search spider visits to AEO endpoints (llms.txt, sitemap, robots.txt). Dashboard teaser with top bots, top spiders, and top content; full report at `/admin/bot-analytics`; AI-generated insights |
| **AI Integration** | Connecting an AI provider (Admin > Settings > AI) adds: natural language Ask the AI input with intent routing, sequential Generate All agent, Rewrite with instructions, AEO auto-draft, tone check, topic focus, reading level, and social post generation. Per-user hourly rate limit (50 calls/hr) enforced server-side with a usage meter in the editor. |
| **Content Revisions** | Each post save creates a revision snapshot; any previous version is restorable from the edit page |
| **Compact Codebase** | Sized to fit within a single AI context window with clear conventions for extension |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions) |
| Language | TypeScript 5 |
| Database | PostgreSQL 16 |
| ORM | Drizzle ORM 0.38 |
| Auth | NextAuth v5 (Credentials + GitHub OAuth + Google OAuth) |
| Styling | Tailwind CSS 3 |
| Editor | Tiptap 3 + tiptap-markdown |
| Storage | Local filesystem / AWS S3 (pluggable) |
| Markdown rendering | react-markdown + remark-gfm + rehype-sanitize |

---

## Community & Recipes

Pugmill extensions are distributed as **recipes** — GitHub repositories containing a plugin or theme plus a `RECIPE.md` written for an AI agent. Recipes follow the [Agent Skills](https://agentskills.io) open standard, which means any compatible agent (Claude Code, Cursor, and others) can install one by reading the `RECIPE.md` directly from a GitHub URL — no registry service or installer tooling required.

The distinction between recipes and skills matters:

| Concept | What it is | Where it lives |
|---|---|---|
| **Recipe** | A packaged plugin or theme for community distribution | Author's GitHub account |
| **Skill** | On-demand agent expertise for a specific task | `.agents/skills/` in a project |

A recipe is installed once and becomes part of the codebase. A skill is activated on demand to guide an agent through a task. Pugmill ships with a built-in `create-pugmill-recipe` skill — activate it when you want an agent to package and publish an extension.

Community recipes are listed at the [Pugmill community directory](https://github.com/michaelsjanzen/pugmill-recipe-community). To publish a recipe, see [`RECIPE_AUTHORING.md`](./RECIPE_AUTHORING.md).

---

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL 16 database
- (Optional) AWS S3-compatible bucket for media storage

### Recommended install on Replit (Agent prompt — **not** "Import from GitHub")

> **Do not use Replit's "Import from GitHub" button.** Replit's importer now reclassifies the repo and auto-generates a bogus **"Migrate from Vercel to Replit"** task. Its agent runs that task *before* reading this project's instructions and goes off the rails — hallucinating a monorepo "migration" that does not exist (Pugmill is a standard Next.js app; there is nothing to migrate). The flow below avoids this by making **your** prompt the agent's first instruction.

**1. Create a new blank Replit App** — the **Agent app** type. Start from an empty project, **not** a GitHub import.

**2. Select the most capable agent.** In the Agent panel, choose the **highest tier available** (e.g. **Power Mode** / the strongest model). Pugmill's setup is multi-step (PostgreSQL module, first-run schema + migrations, secrets, `/setup`); the strongest agent follows the project's `AGENT.md` far more reliably than the default.

**3. Paste this prompt to the agent** (it points the agent at the repo and, critically, tells it to read the project's instructions first and ignore Replit's auto-generated migration task):

```
Install Pugmill CMS from https://github.com/pugmillcms/pugmill

Important — read before doing anything:
- This is a standard Next.js app. Do NOT "migrate" it to anything. If Replit
  has auto-generated a "Migrate from Vercel to Replit" (or any migration) task,
  ignore and dismiss it — there is nothing to migrate.
- FIRST, clone the repo and read AGENT.md and README.md, then follow AGENT.md's
  setup steps exactly, in order. Do not improvise or restructure the project.
- Add the PostgreSQL module so DATABASE_URL is set. Then run the dev server —
  the predev hook (scripts/replit-init.ts) creates the schema and applies
  migrations on first start. Wait for it to finish before assuming anything broke.
- Ask me for any secrets AGENT.md requires, and offer pre-generated values.
- When setup completes, tell me to open /setup to create my admin account.
```

**Secrets:** on first run `replit-init` auto-generates `NEXTAUTH_SECRET`, `AI_ENCRYPTION_KEY`, and `CRON_SECRET`, and auto-detects `NEXTAUTH_URL` from your Replit domain — so for a basic install you don't need to provide any. Before your first **production** deploy, pin `NEXTAUTH_SECRET` as a Replit Secret (so logins survive redeploys), and set `PRODUCTION_URL` only if you use a **custom domain**.

### 1. Clone and install

```bash
git clone https://github.com/pugmillcms/pugmill.git
cd pugmill
npm install
```

### 2. Configure environment

Copying the example env file and filling in the required values:

```bash
cp .env.example .env.local
```

Required variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pugmill

# NextAuth
NEXTAUTH_URL=http://localhost:5000
NEXTAUTH_SECRET=your-secret-here

```

Optional variables (OAuth, S3, etc.) are documented in [REQUIREMENTS.md](./REQUIREMENTS.md#environment-variables).

### 3. Start the dev server

```bash
npm run dev
```

The `predev` hook auto-runs `scripts/replit-init.ts`, which creates the database schema and applies migrations. There is no separate `db:init` step on a fresh install.

### 4. Create your admin account

Open the dev URL in a browser and visit **`/setup`**. Fill in your email, password, and name in the wizard. (Visiting `/admin/login` on a fresh install redirects there automatically.)

The admin dashboard is at [http://localhost:5000/admin](http://localhost:5000/admin) once you've signed in.

For existing deployments after pulling schema changes:
```bash
npm run db:migrate     # incremental migrations (safe to re-run)
```

---

## Deploying to Production

Two steps are required before a production deployment works correctly.

### 0. Verify `.replit` has a `[deployment]` section

If you followed the **Recommended install** flow above (blank Repl + agent prompt to clone), you're already set — the cloned `.replit` ships with a correct `[deployment]` block.

If Replit reports **"Publishing not available"** or **"Invalid run command"** when you click Publish, the workspace `.replit` is missing or has been overwritten by Replit's project template. This commonly happens when:

- You used **Import from GitHub** (Replit's importer overwrites `.replit` with a generated one).
- An agent recreated `.replit` from scratch instead of cloning it from the repo.
- The project was assembled by pasting code into a blank Repl without copying `.replit`.

Open `.replit` and confirm it contains:

```toml
[deployment]
deploymentTarget = "autoscale"
build = ["npm", "run", "build"]
run  = ["npm", "run", "start"]
```

**Do not** create an `artifact.toml` — Pugmill is a standard Next.js app, not a Replit artifact. If an agent suggests registering Pugmill as an artifact, stop it; the fix is to add the `[deployment]` block above to `.replit`.

If the section is missing, ask Replit's agent to "configure deployment as autoscale with build `npm run build` and run `npm run start`" — it will write the section through the proper tool. (Direct edits to `.replit` are blocked by the platform.)

### 1. Set `PRODUCTION_URL` as a Replit secret (or environment variable)

`PRODUCTION_URL` is the canonical production domain. `replit-init.ts` reads it at startup and automatically writes both `NEXTAUTH_URL` and `PRODUCTION_URL` to `.env.local` so the Next.js server picks them up:

```env
PRODUCTION_URL=https://your-domain.com
```

Without this, NextAuth redirects and OAuth callbacks will target the wrong host. Do not rely on auto-detection for a custom domain.

### 2. Run database migrations on existing installs

The production database is separate from dev. After pulling updates that include schema changes, run:

```bash
npm run db:migrate
```

On a **fresh** production deploy, `npm run start` handles first-run setup automatically via the `prestart` hook — schema creation happens before the server boots. Then visit **`/setup`** to create your admin account through the in-app wizard.

---

## Project Structure

```
pugmill/
├── src/
│   ├── app/
│   │   ├── (site)/               # Public-facing routes
│   │   │   ├── blog/             # Paginated blog listing
│   │   │   └── post/[slug]/      # Individual post pages
│   │   ├── admin/                # Admin dashboard
│   │   │   ├── bot-analytics/    # Bot analytics report
│   │   │   ├── posts/            # Post CRUD
│   │   │   ├── pages/            # Page CRUD
│   │   │   ├── categories/       # Category management
│   │   │   ├── tags/             # Tag management
│   │   │   ├── media/            # Media library
│   │   │   ├── users/            # User management
│   │   │   ├── design/           # Design token editor (draft/publish)
│   │   │   ├── themes/           # Theme switcher
│   │   │   └── settings/         # Site configuration
│   │   ├── api/                  # REST API (public, read-only)
│   │   │   ├── posts/
│   │   │   ├── categories/
│   │   │   ├── tags/
│   │   │   └── media/
│   │   ├── [slug]/llms.txt/      # Per-section llms.txt (fires request:bot-visit)
│   │   ├── llms.txt/             # Site-level llms.txt (fires request:bot-visit)
│   │   ├── llms-full.txt/        # Full-content llms.txt (fires request:bot-visit)
│   │   ├── sitemap.xml/          # XML sitemap route handler (fires request:bot-visit)
│   │   ├── robots.txt/           # Robots.txt route handler (fires request:bot-visit)
│   │   └── feed.xml/             # RSS 2.0 feed
│   ├── components/
│   │   └── editor/
│   │       ├── MarkdownEditor.tsx    # Tiptap Visual/Markdown toggle; toolbar portals into sticky header
│   │       ├── AeoMetadataEditor.tsx # AEO Q&A, entity, and keyword builder
│   │       ├── PostForm.tsx          # Full post editor (two-column, sticky lavender header, autosave)
│   │       ├── PostImagePanel.tsx    # 4-column image grid with featured image and drag-and-drop
│   │       └── useAiTools.ts         # AI state, handlers, intent routing, sequential Generate All
│   ├── lib/
│   │   ├── db/                   # Drizzle schema + client
│   │   ├── actions/              # Server Actions (posts, media, users, autosave, alt text update...)
│   │   ├── storage/              # Storage abstraction (Local + S3)
│   │   ├── auth.ts               # NextAuth configuration
│   │   ├── bot-detection.ts      # Shared detectBot(), classifyPath(), BOT_CONFIG (13 bots)
│   │   ├── config.ts             # DB-backed site config (60s TTL cache)
│   │   └── hooks/                # HookManager
│   └── types/
│       └── next-auth.d.ts        # Module augmentation for typed session
├── plugins/                      # Drop-in plugin packages
│   ├── bot-analytics/            # AI crawler + search spider tracking (enabled by default)
│   ├── contact-form/
│   └── cookie-consent/
├── themes/                       # Visual theme packages
│   ├── default/                  # Built-in default theme (clean, Geist-inspired)
│   ├── editorial/                # Built-in editorial theme (warm serif, publication-grade)
│   ├── mono/                     # Built-in mono theme (terminal aesthetic, monospace)
│   └── _template/                # Starter template for new themes
├── scripts/
│   ├── create-schema.ts          # Creates all tables (IF NOT EXISTS); pre-marks migrations on fresh installs
│   ├── run-migrations.ts         # Migration runner; tracks applied files in schema_migrations table
│   ├── migrate-NNN-*.ts          # Incremental column-add migrations (IF NOT EXISTS guards)
│   ├── setup.ts                  # First-run admin seed
│   └── env-check.ts              # Env var validation
├── pugmill.config.json           # Seed config: active theme, enabled plugins
├── AGENT.md                      # AI agent instructions (read this first)
├── PHILOSOPHY.md                 # Design principles for the human-AI team
├── DESIGN_INFLUENCES.md          # Design systems behind the themes & admin UX
├── UX_PATTERNS.md                # Admin interaction & content patterns
├── CHANGELOG.md                  # Version history
├── REQUIREMENTS.md               # Full product requirements
└── SECURITY.md                   # Security policy
```

---

## Content Model

### Post types

| Type | Description |
|---|---|
| `post` | Dated blog entry; appears in `/blog` and `/feed.xml` |
| `page` | Evergreen page; nestable under a parent page |

### AEO Metadata

Each post or page can carry structured AEO metadata stored as JSONB:

```json
{
  "summary": "One-paragraph plain-English summary for LLMs",
  "questions": [
    { "q": "What is Pugmill?", "a": "A full-stack CMS for developers working with AI agents..." }
  ],
  "entities": [
    { "type": "SoftwareApplication", "name": "Next.js", "description": "React framework" }
  ],
  "keywords": ["cms", "next.js", "ai-native"]
}
```

This data surfaces in `/llms.txt`, `/llms-full.txt`, and `/{slug}/llms.txt`.

---

## REST API

All endpoints return `{ data, meta }` with CORS headers. Responses are unauthenticated (public, read-only).

| Endpoint | Description |
|---|---|
| `GET /api/posts` | Paginated posts; supports `?page=`, `?limit=`, `?published=` |
| `GET /api/posts/[slug]` | Single post by slug, with AEO metadata |
| `GET /api/categories` | All categories |
| `GET /api/tags` | All tags |
| `GET /api/media` | All media records |

Example:

```bash
curl https://your-site.com/api/posts?limit=5&page=1
```

```json
{
  "data": [
    {
      "id": 1,
      "slug": "hello-world",
      "title": "Hello World",
      "excerpt": "My first post",
      "type": "post",
      "parentId": null,
      "categories": [{ "id": 1, "name": "General", "slug": "general" }],
      "tags": [],
      "createdAt": "2026-03-01T00:00:00.000Z",
      "updatedAt": "2026-03-01T00:00:00.000Z"
    }
  ],
  "meta": { "total": 42, "page": 1, "limit": 5, "totalPages": 9 }
}
```

---

## AEO and llms.txt

Pugmill implements the [llms.txt specification](https://llmstxt.org/):

| Route | Content |
|---|---|
| `/llms.txt` | Site overview and index of all published content |
| `/llms-full.txt` | Full content of every post, including AEO Q&A |
| `/{slug}/llms.txt` | Section-level index for a parent page and its children |

---

## Storage

Pugmill auto-detects the storage backend. In most cases you don't need to set `STORAGE_PROVIDER` explicitly.

| Provider | When active | Setup |
|---|---|---|
| `local` (default) | No other provider detected | Zero config; files saved to `public/uploads/`. Persistent on Replit's filesystem |
| `s3` (advanced) | `STORAGE_PROVIDER=s3` | Any S3-compatible store — AWS, R2, Supabase, DO Spaces, MinIO |

For most Replit installs, `local` is fine — Replit's filesystem persists across restarts. Use `s3` if you need media to outlive the Replit container or want CDN-backed delivery.

### S3 (advanced)

S3-compatible storage works but is easy to misconfigure. You need the right combination of endpoint, region, path-style addressing, bucket public policy, and public URL. Required env vars:

```env
STORAGE_PROVIDER=s3
S3_BUCKET=my-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_ENDPOINT=          # Optional: R2, DO Spaces, Supabase, MinIO
S3_PUBLIC_URL=        # Optional but usually required for non-AWS: the CDN/public URL prefix
S3_PUBLIC_ACL=        # Set to "false" for R2 and CDN-fronted buckets
```

Gotchas: Supabase S3's public URL is **not** the S3 endpoint — it's `https://<project>.supabase.co/storage/v1/object/public/<bucket>`. R2 requires `S3_PUBLIC_ACL=false`. Path-style is forced automatically for any non-AWS endpoint.

---

## Plugin Development

Plugins live in `/plugins/<name>/` and export a `PugmillPlugin` object:

```typescript
// plugins/my-plugin/index.ts
import type { PugmillPlugin } from "@/lib/plugin-registry";

const plugin: PugmillPlugin = {
  id: "my-plugin",
  name: "My Plugin",
  version: "1.0.0",
  description: "Does something useful.",
  async initialize(hooks, settings) {
    hooks.addAction("post:after-save", async ({ post }) => {
      // react to a new post being saved
    });
    hooks.addFilter("content:render", ({ input, post }) => {
      return input + "\n\n*Custom footer appended by my-plugin.*";
    });
  },
};

export default plugin;
```

Enabling and configuring plugins happens via Admin > Settings > Plugins. The full hook catalog is in [`HOOKS.md`](./HOOKS.md).

---

## Theme Development

Three themes ship with core: **Default** (clean, modern), **Editorial** (warm serif, publication-grade), and **Mono** (terminal aesthetic, monospace throughout). Themes live in `/themes/<name>/` and export a `Layout.tsx`, page-level views (`HomeView`, `PostView`, `PageView`, `Sections`), and a `design.ts` contract. Themes are activated via Admin > Themes.

### Homepage sections

The homepage is composed from an ordered stack of typed sections — hero, post feed, featured post, text block, and CTA — edited visually in Admin > Design > Homepage. Sections are stored as JSON in the design config and rendered through each theme's `Sections.tsx`, so the visual treatment is fully theme-controlled.

### Design token contract

Each theme defines its editable surface in `design.ts`:

```ts
// themes/my-theme/design.ts
export const DESIGN_TOKEN_DEFS: DesignTokenDef[] = [
  {
    key: "colorAccent",
    label: "Accent",
    type: "color",
    group: "colors",
    cssVariable: "--color-accent",
    default: "#2563eb",
    editable: true,
  },
  // ... more tokens
];
```

Token types: `"color"` (color picker), `"google-font"` (font selector), `"select"` (dropdown). Tokens with `editable: false` inject into CSS but are hidden from the admin UI. Design changes save as a draft and go live only when published, leaving the live site unaffected until then.

The full contract is in [`THEMES.md`](./THEMES.md). The [`/themes/_template/`](./themes/_template/) directory is the recommended starting point for new themes.

---

## Security

- Pre-commit hook scans staged files for hardcoded secrets, `.env` files, private keys, AWS keys, and connection strings
- All admin routes require an authenticated session with `admin` or `editor` role
- Media uploads are path-traversal guarded; accepted MIME types are `image/*` and common document formats
- HTML rendering uses `rehype-sanitize`; raw HTML in Markdown is sanitized before display
- The vulnerability disclosure policy is in [SECURITY.md](./SECURITY.md)

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server (port 5000 default) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run setup` | **Local-dev only.** Interactive admin-account seeder; do **not** run on Replit or any other agent-driven environment — it uses `readline` and will hang waiting on a TTY. Use the `/setup` browser wizard instead. |
| `npm run db:init` | **Local-dev only.** Calls `db:create` followed by `npm run setup`; same TTY caveat as above. The `predev` hook handles schema creation automatically on Replit. |
| `npm run db:create` | Create all tables with IF NOT EXISTS guards (safe to re-run) |
| `npm run db:migrate` | Apply pending migration scripts in order; tracks applied files in `schema_migrations` (safe to re-run) |
| `npm run db:push` | Push Drizzle schema via drizzle-kit (dev only) |
| `npm run db:studio` | Open Drizzle Studio (visual DB browser) |
| `npm run env:check` | Validate required environment variables |
| `npm run replit:init` | Force re-run the Replit first-run setup wizard |

---

## License

MIT -- see [LICENSE](./LICENSE).
