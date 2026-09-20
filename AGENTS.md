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
- **App settings** (`lib/settings.ts`): cached 30s in-memory helper reading `settings_app` id=1 (logo, favicon, name, tagline, timezone, **address**, **phone**, storage type). Also exports `getAppTimezone()`. Print headers use `getAppSettings()`.
- **RBAC enforcement**: `lib/permissions.ts` — cached (30s per roleId) permission map from `role_permissions` join. `lib/api-auth.ts` — `requirePermission(request, pagePath, permName)` for API routes (returns AuthUser or 401/403 Response), `requireAuth(request)` for auth-only routes, `requirePageRead(pagePath)` for server component pages (calls `notFound()` on failure). Permission mapping: GET→Read, POST→Add, PUT→Edit, DELETE→Delete, PATCH→Restore, Clone→Clone, Export→Export. Sidebar uses `/api/pages?mine=1` filtered by View permission.
- **Datetime** (`lib/datetime.ts`): pure formatting — **`formatDateOnly(date, timeZone)` is the project standard** and always returns **`YYYY-MM-DD`** (app timezone via `getAppTimezone()`). `formatDateTime` / `formatDateTimeLong` are deprecated aliases of `formatDateOnly`. **No db/server imports** — client components depend on this. All timestamp columns use `timestamp({ withTimezone: true, mode: "date" })` (timestamptz).
- **File uploads**: `app/api/upload/` — filesystem (`public/uploads/`) or Cloudinary, chosen by `settings_app.primaryStorage`.

## Schema conventions

All soft-deletable tables share `commonStatusEnum` (`status_common`: Active/Deleted) plus:

```
status         commonStatusEnum  notNull  default "Active"
createdAt      timestamp("...", { withTimezone: true, mode: "date" })  defaultNow  notNull
updatedAt      timestamp("...", { withTimezone: true, mode: "date" })  nullable    set on PUT only
deletedAt      timestamp("...", { withTimezone: true, mode: "date" })  nullable    set on DELETE, cleared on PATCH restore
createdBy      bigint("...", { mode: "number" })  FK → users.id  nullable  set to auth.userId on POST
updatedBy      bigint("...", { mode: "number" })  FK → users.id  nullable  set to auth.userId on PUT
deletedBy      bigint("...", { mode: "number" })  FK → users.id  nullable  set to auth.userId on DELETE, cleared on PATCH restore
deletedReason  text                  nullable  set on DELETE from optional request body { reason }, cleared on PATCH restore
```

**Audit fields**: `requirePermission()` returns `AuthUser` with `userId` — use it to set `createdBy`/`updatedBy`/`deletedBy`. DELETE accepts optional JSON body `{ reason: string }` to populate `deletedReason`. PATCH (restore) must clear `deletedBy`, `deletedReason`, and set `updatedBy`.

**Schema conventions**: All table IDs use `bigserial("id", { mode: "number" }).primaryKey()` and all FK columns use `bigint("col", { mode: "number" }).references(...)` — the `mode: "number"` ensures Drizzle returns JS `number` (not BigInt). Non-FK numeric columns (e.g. `pages.order`, `settingsMail.smtpPort`) stay as `integer`.

Existing tables in `lib/db/schema.ts`: `departments`, `categories`, `locations`, `uoms`, `payment_methods`, `payment_terms`, `trans_types`, `stock_levels`, `stock_movements`, `receivings`, `receiving_items`, `releasings`, `releasing_items`, `transfers`, `transfer_items`, `adjustments`, `conversions`, `suppliers`, `products`, `gst_types`, `roles`, `users`, `pages`, `permissions`, `role_permissions`, `currencies`, `timezones`, `settings_app`, `settings_mail`, `settings_sms`, `settings_cloudinary`, `refresh_tokens`. Add new tables here.

**`receivings` / `receiving_items`**: document workflow enum **`inventory_status`** / TS **`inventoryStatusEnum`** (`Draft` | `Completed` | `Cancelled`) — **not** `commonStatusEnum`. Shared with **releasings** / **releasing_items**. Audit columns use standard **`deleted_at` / `deleted_by` / `deleted_reason`** (renamed from cancelled_*). Trans # `RCV-#####` / batch `BATCH-######` derived from ids. Master form first; items on detail. **Mark as Completed** uses `db.transaction` in `lib/receiving-stock.ts`: insert `stock_movements` (+qty), upsert `stock_levels`, update `products.stock`/`lastCost`/`avgCost`. Draft cancel does **not** reverse stock; completed cancel can reverse via same helper. Trans types seeded: `Receiving`, `Receiving Cancel`. UI Created/Updated/Deleted By use `formatUserDisplay` → `[lastname], [F].`. **List page defaults to `status=Draft`**; Completed/Cancelled only via Advanced Search (Clear returns to Draft).

**Receivings detail UI/print** (`/receivings/[id]` + `components/receivings/receiving-detail-client.tsx`):
- **List:** Trans # **`RCV-#####` is clickable** → detail (`receivings-columns.tsx` calls `onView`); Eye/View does the same.
- **Layout:** roles-style **two-column** — left **Receiving Items** (toggle cancelled + modals), right **Receiving Information** (trans #, date, supplier, location, PO/invoice, status, audit users).
- **Actions (one row):** **Back** (to `/receivings`, label Back only) + status-gated **Edit / Mark as Completed / Cancel / Print / Restore**.
- **Items DataTable:** Series `BATCH-######`, Product, **UOM**, Qty/Cost/Total **`0.0000` right-aligned**, Expiry, Remarks, Status; Edit/Cancel/Restore only when master is **Draft**.
- **Print PDF** uses shared **`printDocumentPdf`** in **`lib/print/document-print.ts`** — RECEIVING banner; fields Date/Supplier/PO \| Status/Invoice/Location; items table as above (no Location column); signatures Received By / Verified By.
- `onMutated` / `reloadKey` refresh items after complete/cancel/restore.

**`lib/settings.ts` `AppSettings`**: includes `appLogo`, `appName`, `appTagline`, `timezone`, **`address`**, **`phone`** — used by **`printDocumentPdf`** headers.

**`stock_levels` is special**: current qty per product+location (unique `(productId, locationId)`), **no status/soft-delete/createdAt**. UI and APIs are **read-only** (GET list/detail only; no Add/Edit/Delete UI). Future transaction modules upsert rows and set `updatedAt`/`updatedBy`. API returns **`updatedByDisplay`** via `formatUserDisplay` (`lib/format-user.ts`).

**`stock_movements` is special**: append-only inventory trail (date, trans type FK, product/location FKs, signed qty, reference ids/description, remarks, `createdAt`/`createdBy`). **No** status/soft-delete. UI/APIs read-only. UI shows Created At/By (not Updated). API returns **`createdByDisplay`** via `formatUserDisplay`. `reference_trans_id`/`reference_item_id` are plain nullable bigints — **no DB FK** until master-detail modules exist. Future transactions insert here **and** upsert `stock_levels`. Trail DataTable keeps Created At despite wide column count (user-requested).

**Releasings detail UI/print** (`/releasings/[id]` + `components/releasings/releasing-detail-client.tsx`):
- **List:** Trans # **`RLS-#####` clickable** → detail; status **View** button same path; list defaults to Draft.
- **Layout:** same two-column pattern as receivings; left **Releasing Items** + **scan bar** (Draft only), right **Releasing Information** (date, from/to location, receiver, status, audit users).
- **Actions:** **Back** + Edit / Mark as Completed / Cancel / Print / Restore (status-gated) — same chrome as receivings.
- **Items:** Series **`RI-######`**, Product Code/Name, Qty `0.0000`, **UOM**, Expiry, Remarks, Status; actions only if master Draft; **show cancelled** toggle.
- **Scan:** Enter / Scan button **auto-adds** item (`GET /api/products/scan` then POST releasing-items); F2 focuses; `5*CODE` qty syntax; stock validated at from-location.
- **Print:** **`printDocumentPdf`** — RELEASING title; Releasing No.; fields Date/From/To \| Status/Receiver; items without cost columns; signatures Released By / Verified By.

**`transfers` / `transfer_items`**: same document pattern as releasings. Trans # **`TRAN-#####`**, series **`TI-######`**. **Both** `fromLocationId` and `toLocationId` **required**. No receiver_name. **Complete** (`lib/transfer-stock.ts`): stock_movements **-qty @ from** and **+qty @ to** (trans **Transfer**); upsert both `stock_levels` legs; **do not update `products`**. Draft cancel: no stock reverse. Stock check at **from** on add/complete. Scan auto-add same as releasings. Print via **`printDocumentPdf`** (TRANSFER / Transfer No.). Sidebar icon `map-pin`. List defaults to Draft; Trans # clickable.

**`conversions`**: single-line product→product conversion at one **location**. Trans # **`CNV-#####`**. Status **`adjustment_status`** Completed|Cancelled (default Completed). Fields: date, locationId, fromProductId + **fromUomId** (from product), fromQty, toProductId + **toUomId**, newQty, remarks. **from ≠ to product**; both qtys > 0; validate from-product `stock_levels` on save. **Save** (`lib/conversion-stock.ts`): movements **−fromQty @ from product**, **+newQty @ to product** (trans **Conversion**); update both `stock_levels` + `products.stock`. **Cancel**: reverse both legs (**Conversion Cancel**) + mark Cancelled. List default Completed; **Add modal** shows readonly From/To UOM via `GET /api/conversions/preview`; View modal 2-col + Print; Cancel reason modal. Sidebar `tag`.

**`adjustments`**: single-line stock adjustment (no child items, **no Draft**). Enum **`adjustment_status`** (`Completed`|`Cancelled`), default **Completed**. Trans # **`ADJ-#####`**. Fields: date, locationId, productId, **uomId** (FK `uoms`, **copied from `products.uomId` on save**), **qtyOld** (from `stock_levels`, server-only), **qtyAdj** (signed, ≠0), **qtyNew = qtyOld + qtyAdj** (server), remarks. **Save** (`lib/adjustment-stock.ts` transaction): insert adjustment Completed + `stock_movements` qty=qtyAdj (trans **Adjustment**) + upsert `stock_levels` + `products.stock += qtyAdj`. **Cancel**: reverse sign on movements/levels/products with trans **Adjustment Cancel**; mark Cancelled + `deleted_*`. List default **Completed**; DataTable columns include **UOM** (`uoms.name` join). **Add modal**: location+product → `GET /api/adjustments/preview` returns `{ qtyOld, uomId, uomName }`; UI shows readonly **UOM** + Old Qty / Adj Qty / New Qty (`0.0000`). **View modal**: 2-column field grid (`sm:grid-cols-2`); **Product** and **Remarks** use `sm:col-span-2`; Close + Print via **`printDocumentPdf`**. Actions: View modal + Cancel (reason). No `/[id]` page. User names via `formatUserDisplay`. Sidebar `bar-chart-3`.

**Soft delete only** — never hard delete. Uniqueness checks must exclude Deleted rows (`ne(status, "Deleted")`).

## CRUD module pattern

Follow the Departments/Roles module end-to-end. Full step-by-step guide with naming conventions and checklist: `MODULE_CREATION.md`. For required FKs, join display names, editable unique codes, and wide-table Created At omission, use **products** as the reference module. For **master-detail documents** (Draft/Completed/Cancelled + items + stock posting), use **receivings** / **releasings** detail pages (`roles/[id]` layout, clickable list Trans #, `lib/receiving-stock.ts` / `lib/releasing-stock.ts` `db.transaction`). For **document PDFs**, call **`printDocumentPdf`** in `lib/print/document-print.ts`.

File layout for a new module `<name>`:

```
lib/db/schema.ts                 — table + enum
lib/validations/<name>.ts        — zod schemas
app/api/<name>/route.ts          — GET list + POST create
app/api/<name>/[id]/route.ts     — GET one + PUT + DELETE (soft) + PATCH (restore)
app/(admin)/<name>/page.tsx      — index page
components/<name>/               — table, form modal, delete modal, columns
```

Register in sidebar by inserting into `pages`. Available icon keys are listed in `MODULE_CREATION.md` (Step 7) and mapped in `components/layout/sidebar.tsx`.

### API conventions

- List `GET`: query params `page`, `limit` (max 100), `search`, `sortBy`, `sortOrder`, `status` (`Active` | `Deleted` | `all`). Response: `{ data: T[], total, page, limit }`.
- Single success: `{ data: T }`. Errors: `{ error: string }` with HTTP status. Always `Response.json(...)`.
- List queries use `ilike` for search, `Promise.all` for data + count.
- **Permission checks**: every handler must call `requirePermission(request, "/<path>", "<Permission>")` as first line inside `try`. The `pagePath` argument must match the `path` column in the `pages` table (e.g. `"/categories"`). Exception: lookup endpoints (currencies, timezones, upload) use `requireAuth` only; settings-application GET uses `requireAuth` (brand info needed by login page).
- **Module helper routes** (e.g. `GET /api/products/next-code` for form prefill) use `requirePermission` with the **parent** pagePath (`/products`) — do **not** add them to `PUBLIC_API_ROUTES`.

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

**Dates**:
- **Display (all pages):** always **`YYYY-MM-DD`** via `formatDateOnly` from `lib/datetime.ts` (tables, mobile cards, PDF/Excel, detail pages). Timezone: `getAppTimezone()` / table `timezone` prop.
- **`formatDateTime` / `formatDateTimeLong`** — deprecated aliases; prefer `formatDateOnly` in new code.
- **Date inputs (forms + Advanced Search filters):** must use **`components/ui/date-picker.tsx`** — calendar only, no free typing, no `type="date"`. Props: `value`/`onValueChange` as `""` or `"YYYY-MM-DD"`, `placeholder?`, `id?`, `allowClear?`.
- Reference: `components/stock-movements/` (format + DatePicker filters).

**User names (Created/Updated/Deleted By)**:
- Format **`[lastname], [F].`** via **`formatUserDisplay(firstname, lastname)`** from **`@/lib/format-user`** (e.g. `Doe, J.`).
- APIs should return `*Display` fields (e.g. `createdByDisplay`, `updatedByDisplay`, `deletedByDisplay`) by selecting `users.firstname` + `users.lastname`; email is optional fallback only.
- Applied on **receivings**, **stock-levels**, **stock-movements** (list, detail, mobile, PDF/Excel). New transaction/inventory modules must follow this — do not show raw email.
- Detail cards that show audit users (Created/Updated/Deleted By) use the same helper.

**Status filters**: most modules use `Active`/`Deleted`/`all`. **Document modules** (e.g. receivings) use workflow enums like `Draft`/`Completed`/`Cancelled` — list APIs must branch on those values, not Active/Deleted.

**Mobile**: DataTables must transpose to card layout below `md` (`hidden md:block` table + `md:hidden` cards). Toolbars stack with `flex-col gap-3 sm:flex-row`. Copy the pattern from `components/roles/` or `components/departments/`.

**Modal scroll shell (standard for all modals)**: pin header + footer; scroll only the body. `DialogContent`: `showCloseButton={false}` + `flex max-h-[90vh] flex-col` + size/border/`p-0`. Body div: `min-h-0 flex-1 overflow-y-auto`. Do not put overflow on the whole dialog. Pattern: `components/conversions/` modals.

**Columns**: Count DataTable data columns only (exclude `#` and `Actions`; include `status` and domain fields). If more than 5 data columns, omit the **Created At** column from `getColumns()` for new modules. `#` and Actions stay. Exports/mobile/detail may still show dates. Reference: products omits Created At; roles/departments keep it as legacy narrow tables.

**Exports**: PDF via `jspdf` + `jspdf-autotable`; Excel via `xlsx`. Include the status column.

**Inventory numbers**: qty/unit cost/total on receivings items (and similar stock amounts) display as **`0.0000`** (schema `decimal(10,4)`). Right-align numeric columns in DataTables and print tables.

## Gotchas

- `AGENTS.md` has an auto-regenerated `<!-- BEGIN/END -->` block from `next dev`. **Keep that block; add content only outside it.**
- `.env*` is gitignored. Dev secrets live in `.env.local` only.
- `db:seed-timezones` and `db:seed-currencies` are required after a fresh push.
- `role_permissions` has a composite unique index on `(roleId, pageId, permissionId)` — inserts must respect it.
- `users` has self-referencing `createdBy`/`updatedBy`/`deletedBy` FKs.
- `lib/datetime.ts` must stay pure (no db/server imports) — client components import from it. Display dates with **`formatDateOnly`** (`YYYY-MM-DD`); date inputs use `DatePicker`.
- Sidebar parent pages need a View grant for children to appear (child won't render without its parent group).
- `accessToken` cookie is set on login and cleared on logout — required for SSR page guards to read roleId.
- Permission cache (`lib/permissions.ts`) invalidates on role-permission mutations — call `invalidatePermissionCache(roleId)` after POST/DELETE on role-permissions or roles/clone.
- **FK form lookups**: form/search modals fetch list APIs (for products: `/api/categories`, `/api/gst-types`, `/api/uoms`). Roles that can open the parent module still need **Read** on those FK pages or dropdowns render empty.
