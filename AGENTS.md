<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Stack

- **Next.js 16.3.2** (App Router, React 19.2.8, Turbopack)
- **Tailwind CSS 4** — CSS-first via `@import "tailwindcss"` + `@theme inline` in `app/globals.css`; no `tailwind.config.js`
- **Drizzle ORM** + `postgres.js` driver against PostgreSQL
- **shadcn/ui** with **base-ui** primitives (not Radix) — style `base-nova`, components in `components/ui/`
- **Auth**: JWT access token (15 min, `localStorage` + readable `accessToken` cookie for SSR) + refresh token (7 days, httpOnly cookie). `apiFetch` wrapper (`lib/api-client.ts`) attaches Bearer header automatically.
- **RBAC**: permissions enforced at sidebar (View), page (Read → 404), and API (Read/Add/Edit/Delete/Restore/Export/Clone) levels. Helpers in `lib/permissions.ts` (30s cache) and `lib/api-auth.ts`.
- **Forms**: `react-hook-form` + `zod`; **Tables**: `@tanstack/react-table` v8
- **Toasts**: `sonner` — `import { toast } from "sonner"` (NOT from `components/ui/sonner`; the shadcn wrapper needs `next-themes`)
- **ESLint 9** flat config; no test suite, no formatter, no typecheck script

## Commands

```bash
npm run dev          # dev server, localhost:3000
npm run build        # production build (runs TS check)
npm run lint         # ESLint only
npx tsc --noEmit     # standalone typecheck (no script configured)

npm run db:push      # push schema directly (prototyping; skips migration files)
npm run db:generate  # generate migration SQL from schema changes
npm run db:migrate   # run pending migrations
npm run db:studio    # Drizzle Studio (browser DB viewer)
npm run db:seed-timezones  # seed timezone table (required after fresh db:push)
npm run db:seed-currencies # seed currency table (required after fresh db:push)
```

All `db:*` scripts use `dotenv-cli` with `-e .env.local` — they load env automatically; do not source manually.

## Setup

1. PostgreSQL on `localhost:5432`. Package name is `boilerplate-postgre`, but the working DB is `hospi-pro` (see `.env`).
2. Copy `.env.example` → `.env.local` and set `DATABASE_URL`. Optional: `JWT_SECRET` (falls back to a hardcoded dev key in `lib/auth.ts`).
3. `npm run db:push` then `npm run db:seed-timezones` and `npm run db:seed-currencies`.

## Path alias

`@/*` → project root (e.g. `@/app/...`, `@/lib/...`). Defined in `tsconfig.json` `paths`.

## Architecture

- **Route groups**: `(admin)/` = protected pages with sidebar layout; `(auth)/` = public login/forgot/reset. Home/dashboard is `app/(admin)/page.tsx`, not `app/page.tsx`.
- **Auth gate**: `proxy.ts` at project root is the **Next.js 16 replacement for `middleware.ts`** (the `middleware` file convention is deprecated). Export must be named `proxy`, not `middleware`. Public API routes are listed in `PUBLIC_API_ROUTES`; public pages in `PUBLIC_PAGES`. New unauthenticated endpoints must be added there.
- **Dynamic sidebar**: nav items come from the `pages` table (parent/child via `parentId`). Adding a menu item = inserting a row, not editing a component. Icon names map in `components/layout/sidebar.tsx`.
- **DB connection** (`lib/db/index.ts`): uses `globalThis` to avoid leaks during HMR.
- **App settings** (`lib/settings.ts`): cached 30s in-memory helper reading `settings_app` id=1 (logo, favicon, name, timezone, currency, storage type). Also exports `getAppTimezone()`.
- **RBAC enforcement**: `lib/permissions.ts` — cached (30s per roleId) permission map from `role_permissions` join. `lib/api-auth.ts` — `requirePermission(request, pagePath, permName)` for API routes (returns AuthUser or 401/403 Response), `requireAuth(request)` for auth-only routes, `requirePageRead(pagePath)` for server component pages (calls `notFound()` on failure). Permission mapping: GET→Read, POST→Add, PUT→Edit, DELETE→Delete, PATCH→Restore, Clone→Clone, Export→Export. Sidebar uses `/api/pages?mine=1` filtered by View permission.
- **Datetime** (`lib/datetime.ts`): pure formatting functions (`formatDateTime`, `formatDateTimeLong`) using `Intl.DateTimeFormat`. **No db/server imports** — client components depend on this. All timestamp columns use `timestamp({ withTimezone: true, mode: "date" })` (timestamptz).
- **File uploads**: `app/api/upload/` — filesystem (`public/uploads/`) or Cloudinary, chosen by `settings_app.primaryStorage`.

## Schema conventions

All soft-deletable tables share `commonStatusEnum` (`status_common`: Active/Deleted) plus:

```
status    commonStatusEnum  notNull  default "Active"
createdAt timestamp("...", { withTimezone: true, mode: "date" })  defaultNow  notNull
updatedAt timestamp("...", { withTimezone: true, mode: "date" })  nullable    set on PUT only
deletedAt timestamp("...", { withTimezone: true, mode: "date" })  nullable    set on DELETE, cleared on PATCH restore
```

Existing tables in `lib/db/schema.ts`: `departments`, `categories`, `roles`, `users`, `pages`, `permissions`, `role_permissions`, `currencies`, `timezones`, `settings_app`, `settings_mail`, `settings_sms`, `settings_cloudinary`, `refresh_tokens`. Add new tables here.

**Soft delete only** — never hard delete. Uniqueness checks must exclude Deleted rows (`ne(status, "Deleted")`).

## CRUD module pattern

Follow the Departments/Roles module end-to-end. Full step-by-step guide with naming conventions and checklist: `MODULE_CREATION.md`.

File layout for a new module `<name>`:

```
lib/db/schema.ts                 — table + enum
lib/validations/<name>.ts        — zod schemas
app/api/<name>/route.ts          — GET list + POST create
app/api/<name>/[id]/route.ts     — GET one + PUT + DELETE (soft) + PATCH (restore)
app/(admin)/<name>/page.tsx      — index page
components/<name>/               — table, form modal, delete modal, columns
```

Register in sidebar by inserting into `pages`. Available icon keys are listed in `README.md`.

### API conventions

- List `GET`: query params `page`, `limit` (max 100), `search`, `sortBy`, `sortOrder`, `status` (`Active` | `Deleted` | `all`). Response: `{ data: T[], total, page, limit }`.
- Single success: `{ data: T }`. Errors: `{ error: string }` with HTTP status. Always `Response.json(...)`.
- List queries use `ilike` for search, `Promise.all` for data + count.
- **Permission checks**: every handler must call `requirePermission(request, "/<path>", "<Permission>")` as first line inside `try`. The `pagePath` argument must match the `path` column in the `pages` table (e.g. `"/categories"`). Exception: lookup endpoints (currencies, timezones, upload) use `requireAuth` only; settings-application GET uses `requireAuth` (brand info needed by login page).

## Next.js 16 gotchas

- `params` and `searchParams` are **Promises** — must `await` them in pages and route handlers.
- Use `PageProps<'/route/[id]'>` / `RouteContext<'/route/[id]'>` for type-safe props; root layout uses `LayoutProps<"/">` (not `PropsWithChildren`).
- Route handlers use standard Web Request/Response APIs.
- `proxy.ts` (not `middleware.ts`) for request interception — see Architecture above.

## UI conventions (Ace Admin style)

Hardcoded hex colors, not Tailwind theme tokens — match these exactly:

- Sidebar `#438eb9`; content bg `#f2f2f2`; cards white with `#ddd` border, header bar `#f8f8f8`
- Section/table headers `#337ab7`; table header row `#f2f2f2`; cell borders `#eee`
- Buttons flat, no border-radius: blue `#337ab7`, green `#5cb85c`, red `#d9534f`, orange `#f0ad4e`
- Fonts: Poppins (`--font-sans`), Roboto Mono (`--font-geist-mono`)
- Status badges: green (Active), gray (Deleted)

**Dropdowns**: use `SearchableSelect` (`components/ui/searchable-select.tsx`) for all foreign-key / ID-based selects. Props: `options` (`{value, label, indent?}`), `value`, `onValueChange`, `placeholder?`, `allOption?`, `allLabel?`. Do NOT use base-ui `Select` for FK dropdowns — only for simple non-ID values (e.g. status All/Active/Deleted).

**Mobile**: DataTables must transpose to card layout below `md` (`hidden md:block` table + `md:hidden` cards). Toolbars stack with `flex-col gap-3 sm:flex-row`. Copy the pattern from `components/roles/` or `components/departments/`.

**Exports**: PDF via `jspdf` + `jspdf-autotable`; Excel via `xlsx`. Include the status column.

## Gotchas

- `AGENTS.md` has an auto-regenerated `<!-- BEGIN/END -->` block from `next dev`. **Keep that block; add content only outside it.**
- `.env*` is gitignored. Dev secrets live in `.env.local` only.
- `db:seed-timezones` and `db:seed-currencies` are required after a fresh push.
- `role_permissions` has a composite unique index on `(roleId, pageId, permissionId)` — inserts must respect it.
- `users` has self-referencing `createdBy`/`updatedBy`/`deletedBy` FKs.
- `lib/datetime.ts` must stay pure (no db/server imports) — client components import from it.
- Sidebar parent pages need a View grant for children to appear (child won't render without its parent group).
- `accessToken` cookie is set on login and cleared on logout — required for SSR page guards to read roleId.
- Permission cache (`lib/permissions.ts`) invalidates on role-permission mutations — call `invalidatePermissionCache(roleId)` after POST/DELETE on role-permissions or roles/clone.
