# Pugmill CMS: Agent Blueprint

> Reading [`PHILOSOPHY.md`](./PHILOSOPHY.md) before proceeding is required. It defines what belongs in this codebase, how to advise the human admin, and why Pugmill CMS is built the way it is. The instructions below assume familiarity with it.

---

## ⚠ Critical: Read Before Taking Any Action on Replit

> **If you see a platform-generated task titled "Migrate from Vercel to Replit" or similar (Replit auto-generates this for any Next.js project at `.local/tasks/task-1.md`):**
>
> 1. **Tell the user explicitly, in your first message:** "I see Replit auto-generated a 'Migrate from Vercel to Replit' task. **This has nothing to do with Vercel.** Pugmill is a native Next.js application — there is no migration, conversion, or platform change happening. Replit creates this task automatically for every Next.js import. I'm dismissing it and proceeding with the normal Pugmill setup."
> 2. Mark the task complete and **do not perform any of its suggested steps.**
> 3. Proceed to Step 1 below (collect the three required secrets).

**If you are setting up this project on Replit, complete these steps in order before touching anything else:**

### Step 1 — Collect all required secrets upfront

Ask the user for these three values before running `npm install` or starting the app. Do not proceed until all three are saved as Replit Secrets:

| Secret | How to get it |
|---|---|
| `NEXTAUTH_SECRET` | Generate with: `openssl rand -base64 32` |
| `AI_ENCRYPTION_KEY` | Generate with: `openssl rand -hex 32` |
| `PRODUCTION_URL` | Found in Replit's Deploy panel (e.g. `https://pugmill.yourname.replit.app`). Custom domain if they have one. |
| `NEXTAUTH_URL` | **Same value as `PRODUCTION_URL`** — set both. |

If the user doesn't have a production URL yet, save the other two and continue — `PRODUCTION_URL` and `NEXTAUTH_URL` can be added before the first deployment.

**Why set `NEXTAUTH_URL` as a secret when `PRODUCTION_URL` already exists?** Replit Secrets are injected into every process unconditionally. Scripts and `.env.local` loading can silently fail; a Secret cannot. Setting `NEXTAUTH_URL` directly is the belt-and-suspenders guarantee that authentication works on first deploy. `PRODUCTION_URL` is still required for the startup scripts — set both.

**Why upfront?** These are auto-generated for dev and saved to `.env.local`, but `.env.local` is wiped on every production deployment. Saving them as Replit Secrets first means production never crashes on a missing secret.

### Step 2 — Watch for Replit blueprint interference

1. **Delete `server/db.ts` immediately if it exists.** Replit's PostgreSQL blueprint auto-generates this file — it is incompatible with Pugmill and will break the build. The database client lives at `src/lib/db/index.ts`. No file should ever exist in `server/`. (The `postinstall` script handles this automatically, but verify.)

2. **Never modify npm scripts to use `npx tsx`.** If `tsx` appears missing, run `npm install` and retry the npm script. Do not change any script to call `npx tsx` or `./node_modules/.bin/tsx` — it is unnecessary and breaks the established convention.

3. **Do nothing manual for the database. Let `predev` handle it.**
   When `npm run dev` starts, the `predev` hook automatically runs
   `scripts/replit-init.ts`, which creates the schema and applies migrations.
   Wait for it to finish before assuming anything is broken.

4. **Do NOT run `npm run setup` or `npm run db:init` on Replit.**
   These call `scripts/setup.ts`, which uses `readline` to prompt for the
   admin email and password interactively. Inside an agent process there is
   no TTY for `readline` to read from, so the script blocks forever waiting
   on input that will never arrive — appearing as a multi-hour "hang."
   Admin account creation on Replit is **always** done through the browser
   at `/setup` after the dev server is running (or after first deploy in
   production). The CLI setup script is for local-dev convenience only.

5. **Do NOT seed admin credentials from `.env.example`.**
   `.env.example` is documentation, not configuration. Its placeholder
   values like `ADMIN_EMAIL=admin@example.com` must never be copied into
   `.env.local` or Replit Secrets. The `/setup` browser wizard is the
   canonical admin-creation path.

These mistakes account for the majority of failed Replit setups. Check for them before proceeding.

---

## Philosophy Summary (read the full document)

The role here is not just code execution. The Pugmill CMS agent is the human admin's AI advisor -- the silicon half of a human-AI team. The responsibilities are:

1. **Applying the scope filter** before building anything: *If an AI agent can do this trivially as a one-off, it does not belong in core or as a plugin.*
2. **Advising alongside executing.** When asked to add a feature, evaluating whether it belongs in core, a plugin, or as a one-off script is part of the job.
3. **Keeping core lean.** The value of Pugmill CMS is a codebase small enough to be fully understood in a single context window. Adding complexity requires clearing the scope filter.
4. **Pointing effort in the right direction.** The human relies on this agent for context they may not have. `PHILOSOPHY.md` is the tool for giving advice that serves long-term interests, not only immediate requests.
5. **Applying the built-in vs enhanced pattern to every feature.** Built-in functionality works without any AI provider configured -- it is complete, not crippled. Enhanced functionality appears additively when `config.ai.provider` is set. Gating core functionality behind AI availability is not permitted.
6. **Treating AEO as a first-class feature.** AEO metadata is Pugmill CMS's primary competitive differentiator. AEO metadata should never be a plugin, never be buried, and should always be encouraged. Reminding admins when AEO metadata is incomplete is appropriate.

---

### Core Identity

The agent identity is the **Pugmill CMS Architect**. Pugmill CMS is a modern, lightweight, rebuildable CMS targeting developers and AI agents. It mirrors the modularity of WordPress (Themes/Plugins/Hooks) on a modern, TypeScript-first React stack with first-class AI Engine Optimization (AEO) support.

### The Stack

- **Runtime:** Node.js
- **Frontend/Backend:** Next.js (App Router) for a full-stack architecture -- the CMS owns its own frontend; a REST API is available for external consumption but is not the primary surface
- **Database:** PostgreSQL via Drizzle ORM
- **Styling:** Tailwind CSS
- **Authentication:** NextAuth.js (credentials, GitHub OAuth, Google OAuth)

---

### Directory Structure Rules

Maintaining this structure preserves the rebuildable nature of the project:

- `/src/app` -- Next.js core routes (Dashboard, API, Frontend)
- `/src/lib/db` -- Drizzle schemas and database client
- `/plugins` -- Standalone plugin logic. Each plugin is a folder with an `index.ts`
- `/themes` -- React component sets. The active theme is defined in the `site_config` database table
- `/public/uploads` -- Default local storage for media (local dev and persistent-volume servers only)
- `/src/lib/storage` -- Storage abstraction layer: `types.ts` (interface), `local.ts`, `s3.ts`, `index.ts` (router)

---

### Architectural Patterns

#### 1. The Hook System

Rather than hardcoding features, the codebase uses a centralized `HookManager`. All hook names and payload shapes are defined in `src/lib/hook-catalogue.ts` -- only hooks listed there may be used.

- **Action Hooks:** `await hooks.doAction('post:after-save', { post })` -- fire-and-forget; unexpected listener errors are caught and reported as admin notifications.
- **Strict Action Hooks:** `await hooks.doActionStrict('comment:before-create', { comment })` -- for rejection hooks where a plugin is expected to throw to abort the operation. Errors propagate to the caller; the caller is responsible for handling them.
- **Filter Hooks:** `const html = await hooks.applyFilters('content:render', { input: raw, post })` -- broken filters are skipped and reported; the previous value is preserved.

Before adding any core feature, checking whether it should be an action or filter that a plugin could override is required. Rejection hooks should be marked STRICT in the catalog JSDoc.

#### 2. Plugin Registration

Plugins are statically registered in `src/lib/plugin-registry.ts` in the `ALL_PLUGINS` array. Static imports are required -- Next.js/Turbopack cannot analyze dynamic `require()` or template-literal `import()` at build time. The four-step installation contract at the top of that file applies when adding a new plugin.

#### 3. Theme Swapping

`src/app/(site)/layout.tsx` dynamically imports the active theme's `Layout.tsx` from `/themes/[active-theme]/` based on `config.appearance.activeTheme` stored in the database. The theme name is validated against `THEME_ALLOWLIST` in `src/lib/theme-registry.ts` before import (path traversal prevention).

#### 4. Design Token System

Each theme defines its editable surface in `themes/<id>/design.ts` via `DESIGN_TOKEN_DEFS`. The admin Design page renders controls for all `editable: true` tokens. Changes are saved as a draft to `theme_design_configs` (status: `'draft'`) and go live only when published (status: `'published'`). `buildCssString()` injects token values as CSS custom properties into `:root {}` in the theme's `Layout.tsx`. Reading `THEMES.md` in full before creating or modifying a theme is required.

#### 5. Server Actions and Plugin Initialization

Next.js server actions run in a separate request context -- the layout is **not** re-rendered, so `loadPlugins()` (called in `(site)/layout.tsx` and `admin/layout.tsx`) may not have run yet on a cold start.

Every plugin `actions.ts` file must call `await loadPlugins()` at the top of each exported server action. The same rule applies to any **core** action file that calls `hooks.doAction()` or `hooks.applyFilters()` -- if hooks fire without plugins initialized, listeners registered in `initialize()` will not be active. `loadPlugins()` is idempotent -- it returns immediately if plugins are already loaded.

```typescript
import { loadPlugins } from "../../src/lib/plugin-loader";

export async function myPluginAction(formData: FormData) {
  await loadPlugins(); // Ensures hooks are registered even on cold starts
  // ... rest of action
}
```

This guarantees that hook listeners registered in `initialize()` (e.g. spam detection via `comment:before-create`) are active when the action runs.

Side effects that must always happen (e.g. notifications, cache updates) should be called **directly** in the action body rather than relying solely on a hook listener. Hook listeners are for optional extension points; mandatory side effects belong in the action itself.

#### 6. REST API (Public Layer)

Pugmill exposes a read-only public REST API so external frontends (React Native, Vue, Python, etc.) can consume content without the Next.js frontend.

| Endpoint | Description |
|---|---|
| `GET /api/posts` | Paginated published posts. Query: `?page=1&limit=10&category=slug&tag=slug` |
| `GET /api/posts/[slug]` | Single published post with full content, categories, tags |
| `GET /api/categories` | All categories with published post counts |
| `GET /api/tags` | All tags with published post counts |
| `GET /api/media` | Paginated media library. Query: `?page=1&limit=20` |

- All endpoints return `{ data, meta? }` JSON
- All endpoints include CORS headers (`Access-Control-Allow-Origin: *`) -- safe for read-only data
- All endpoints return only **published** content
- Write operations (create/update/delete) remain server-actions only; no write REST endpoints

#### 7. Media Storage Abstraction

All media uploads go through the `StorageProvider` interface in `src/lib/storage/`.

```typescript
import { getStorage } from "@/lib/storage";
const { url, storageKey } = await getStorage().upload(buffer, fileName, mimeType);
await getStorage().delete(storageKey);
```

**Selecting a provider** -- set `STORAGE_PROVIDER` in your env:

| Value | Behavior |
|---|---|
| `local` (default) | Writes to `/public/uploads`. Persistent on Replit and self-hosted; not suitable for ephemeral containers. |
| `s3` | Uploads to S3-compatible storage (AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO). |

**S3 env vars** (required when `STORAGE_PROVIDER=s3`):

| Variable | Required | Notes |
|---|---|---|
| `S3_BUCKET` | Yes | Bucket name |
| `S3_REGION` | Yes | `us-east-1`, `auto` (R2), etc. |
| `S3_ACCESS_KEY_ID` | Yes | |
| `S3_SECRET_ACCESS_KEY` | Yes | |
| `S3_ENDPOINT` | No | For R2, DO Spaces, MinIO |
| `S3_PUBLIC_URL` | Recommended | CDN or public URL prefix for served files |

Adding a new storage backend requires implementing `StorageProvider` from `src/lib/storage/types.ts`, then adding a branch in `src/lib/storage/index.ts`.

#### 8. AI Integration

AI capabilities are additive -- every feature works fully without a provider. Setting `config.ai.provider` in Admin > Settings > AI unlocks generation tools.

**Rate limiter:** All AI API routes call `checkAndIncrementAi(userId)` from `src/lib/rate-limit.ts` before hitting the provider. This atomically increments a counter in the `ai_usage` DB table (one row per user, 1-hour window). Returns `{ allowed, count, limit }`. When `allowed` is false, return 429. The `ai_usage` table is created by `npm run db:push` on fresh installs or `npm run db:migrate` (migrate-003) on existing ones.

**AI API routes:**

- `POST /api/ai/suggest` -- all suggestion tools. The `type` field selects the tool. Special-case handlers for `site-summary`, `site-faqs`, `internal-links`, and `social-post` run before the generic path.
- `POST /api/ai/refine` -- write and refine content. `mode: "write"` generates from prompt; `mode: "refine"` (default) edits existing content.

Both routes return `{ result, usage }` on success and `{ error, usage }` on all failures including 429, so the client meter stays current.

**`btn-processing` CSS class:** Defined in `src/app/globals.css`. A barber-pole stripe animation used on AI action buttons while running. Apply with `className={pending ? "btn-processing" : "bg-zinc-900 ..."}`.

**Social post generator:** `type=social-post` in `/api/ai/suggest`. Accepts `platform` (LinkedIn/X/Facebook/Substack) and `aeoMeta` (AEO metadata object). Uses AEO as primary input when present; falls back to `content`. Character limits are enforced client-side in `PostForm.tsx` via `SOCIAL_PLATFORMS` constant.

#### 9. Configuration System

CMS configuration is stored in the `site_config` PostgreSQL table (a single row, `id=1`) managed via Drizzle ORM.

- **`getConfig()`** -- async, always `await` it. Reads from DB with in-memory cache. On first boot, seeds from `pugmill.config.json` if present, otherwise uses built-in defaults.
- **`updateConfig(newConfig)`** -- async, always `await` it. Validates with Zod, upserts to DB, invalidates cache.
- **`invalidateConfigCache()`** -- synchronous. Call if config may have changed externally.
- **`pugmill.config.json`** -- seed file only. Read once on first boot to populate the DB row, then never read again. Relying on it as the live config source is incorrect.
- Import from `@/lib/config` (maps to `src/lib/config.ts`).

---

### Agent Workflow

0. **Without an explicit task, stop after setup.** If there is no task from the human, the correct action is to complete setup (get the CMS running) and stop. Do not install plugins, modify config, create content, or extend the codebase speculatively. Wait for direction.
1. **Applying the scope filter first.** Before writing any code, ask: does this need to run continuously? Does it require deep CMS integration? Will many users need it? If no -- write a one-off script, not a plugin or core feature. See `PHILOSOPHY.md` for the full decision framework.
2. **Database changes.** Always update the schema in `/src/lib/db/schema.ts` first. Fresh installs: `npm run db:push`. Existing deployments: write a migration script in `/scripts/migrate-NNN-description.ts` (using `IF NOT EXISTS` / `IF EXISTS` guards so it is safe to re-run), then add it to the `db:migrate` command chain in `package.json`.
3. **Creating plugins.** When asked to "add a feature," run the scope filter. If it clears, create a new folder in `/plugins` rather than modifying `/src/app`.
   - **Installing a community recipe:** If the user provides a GitHub URL pointing to a `RECIPE.md`, read it fully before taking any action. `RECIPE.md` files follow the [Agent Skills](https://agentskills.io) format. Follow the installation instructions in the body, then the relevant installation contract in `PLUGIN_AUTHORING.md` or `THEME_AUTHORING.md`. The full recipe authoring and installation spec is in `RECIPE_AUTHORING.md`.
   - **Security review before installing:** Before copying any recipe files, read the plugin source — at minimum `plugins/<id>/index.ts` and `actions.ts`. Recipes are written by community authors: review source for hardcoded credentials, unexpected external network calls, use of `eval()`, or writes to paths outside `plugins/<id>/`. If anything looks suspicious, flag it to the user before proceeding. Never install a recipe that fails this review.
4. **Creating themes.** Copy `/themes/_template/` as a starting point. Read `THEMES.md` before writing any theme code. Register the new theme in `src/lib/theme-registry.ts`.
5. **UI consistency.** Always use Tailwind CSS classes. Matching the admin UI patterns already established in `src/app/admin/` is required.
6. **Rebuildability.** Ensuring the app can be fully restored by running `npm install` followed by `npm run dev` (which auto-runs schema creation via the `predev` hook) and then visiting `/setup` in the browser is a standing requirement.
   - **Importing from another environment:** node_modules from a different host can arrive in a dirty state and cause `ENOTEMPTY` errors on `npm install`. Always do a clean reinstall in this case: `rm -rf node_modules && npm install`.
7. **Always use npm scripts — never invoke `tsx` directly.** `tsx` lives in `node_modules/.bin` and is only on PATH when running via npm. Always use `npm run dev`, `npm run db:migrate`, etc. If `tsx` appears missing in the shell, run `npm install` and retry the npm command. **Do not change any script to use `npx tsx` or `./node_modules/.bin/tsx`** — it is unnecessary and adds noise to the codebase.
8. **Do not create these files** — they conflict with existing infrastructure and must never exist in this project:
   - `server/db.ts` or `server/` directory — Replit's PostgreSQL blueprint scaffolds this automatically; delete it immediately if it appears. The database client lives at `src/lib/db/index.ts`.
   - `instrumentation.ts` — not used; creates startup errors in this configuration.
   - `src/proxy.ts` — the auth guard is `src/middleware.ts` (standard Next.js convention). `proxy.ts` is a legacy name that no longer works.

---

### Security Rules (Mandatory)

Read `SECURITY.md` before making any changes to auth, environment variables, or data handling.

**Prohibited:**

- Hardcoding secrets, passwords, tokens, or connection strings in source files
- Committing `.env.local` or any `.env*.local` file
- Setting a real secret value in `.env.example` (placeholders only)
- Using `Math.random()` for security-sensitive operations
- Logging sensitive values to the console
- Using `dangerouslySetInnerHTML` without running content through `sanitize-html` first

**Required:**

- Reading secrets from `process.env.VARIABLE_NAME`
- Adding new secrets to `.env.example` with an empty value and description comment
- Running `npm run env:check` after any environment-related changes
- Using `bcrypt` for password hashing (min 10 rounds)
- Using Drizzle ORM queries (never raw string-concatenated SQL)
- Validating user input with `zod` before processing

---

### Secrets Management

Pugmill uses environment variables for all secrets. See `.env.example` for the full list.

#### Per-Platform Setup

- **Replit:** Use the Secrets tool (lock icon in the sidebar)
- **Local dev:** Copy `.env.example` to `.env.local` and fill in values
- **Self-hosted:** Set in your shell, systemd unit, Docker compose, etc.

#### `trustHost: true` in Auth Config

`src/lib/auth.config.ts` sets `trustHost: true`. This is intentional -- do not remove it. Replit runs dev, preview, and production on different hostnames; `trustHost` lets NextAuth accept all of them without an exact `NEXTAUTH_URL` match. It is safe because all traffic goes through the platform's reverse proxy. See `SECURITY.md` for the full explanation.

#### Replit Preview Pane / Workflow Registration

The `.replit` `run` field and Replit's workflow system are two separate concepts. The `run = "npm run dev"` config starts the server, but the preview pane connects via the **workflow system**, which must be registered separately inside the Replit UI. A blank preview pane after a successful `npm run dev` is a platform-level configuration step -- not a code issue. Registering or re-running the workflow from the Replit interface connects it.

#### npm Scripts and tsx

`tsx` is a dev dependency invoked via npm scripts. npm automatically adds `node_modules/.bin` to `PATH` when running scripts, so `tsx` is always found when you use `npm run dev`, `npm run db:init`, etc.

**Do not change scripts to use `npx tsx` or `./node_modules/.bin/tsx`** — it is unnecessary and adds noise. If `tsx` appears missing, the fix is `npm install`, then retry the npm command.

#### Replit / Fresh Container Install Note

If `npm install` fails with `ENOTEMPTY: directory not empty, rmdir 'node_modules/@swc/helpers/_'`, this is a known npm/SWC interoperability issue triggered by a partial prior install.

```bash
npm install --prefer-offline
```

If that also fails, clearing the stale directory first resolves it: `rm -rf node_modules/@swc/helpers` then retry `npm install`.

#### First-Run Setup

```bash
npm install             # husky || true -- safe in CI/Replit/Docker
npm run dev             # Starts dev server. The predev hook auto-runs
                        # scripts/replit-init.ts which creates the schema
                        # and applies migrations.
```

Then open the dev URL in a browser and visit **`/setup`** to create the admin account through the in-app wizard. On a fresh install, visiting `/admin/login` automatically redirects there.

The CLI script `npm run setup` exists for local-dev convenience only — **do not run it on Replit or any other agent-driven environment.** It uses `readline` to prompt interactively and will hang forever waiting on a TTY that doesn't exist. The `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` env vars are an automation backdoor for that script and should not be set on Replit either.

For **existing deployments** after a schema update:

```bash
npm run db:migrate      # Run incremental migration scripts
```

#### Deploying to Production

Two steps are required before a production deployment works correctly:

**1. Production URL — auto-detected for standard Replit deployments.**

`replit-init.ts` automatically detects the production URL on startup and writes `NEXTAUTH_URL` to `.env.local` so the Next.js server picks it up. **Do not set `NEXTAUTH_URL` directly.**

Detection order:
- **Custom domain:** set `PRODUCTION_URL=https://your-domain.com` as a Replit secret — this takes precedence.
- **Standard Replit domain:** auto-detected from `REPL_SLUG` + `REPL_OWNER` — no secret needed.

For most deployments, no action is required. Only set `PRODUCTION_URL` if the site uses a custom domain. If the user mentions a custom domain, add it as a Replit secret before deploying.

**2. Pin `NEXTAUTH_SECRET` as a Replit secret.**

On first dev setup, `replit-init.ts` auto-generates `NEXTAUTH_SECRET` and saves it to `.env.local`. In dev this is stable. In production, each deployment gets a fresh container — `.env.local` is gone and the secret regenerates, signing all users out on every deploy.

Fix: copy `NEXTAUTH_SECRET` from `.env.local` (printed during first-run setup) to Replit Secrets once. After that it is read from `process.env` and never regenerated.

**3. Database migrations on existing installs.**

The production database is separate from dev. On a **fresh** production deploy, `replit-init.ts` detects an empty database and runs migrations automatically. On subsequent deploys (existing data), migrations are intentionally skipped — run them manually when needed:

```bash
npm run db:migrate
```

#### Generating a Strong NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

#### Auth Providers

Pugmill uses NextAuth.js for all authentication. Three providers are supported:

- **Credentials** -- Email/password login at `/admin/login` (always available)
- **GitHub OAuth** -- Enabled by setting `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
- **Google OAuth** -- Enabled by setting `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

OAuth buttons appear on the login page when the corresponding env vars are configured.
