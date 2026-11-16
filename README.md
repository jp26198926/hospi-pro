# RBAC System

Role-Based Access Control system built with Next.js 16, Drizzle ORM, and PostgreSQL.

## Features

- JWT authentication (access + refresh tokens)
- **Full RBAC enforcement** — sidebar filtered by View permission, pages require Read (404 if denied), APIs enforce Read/Add/Edit/Delete/Restore/Export/Clone
- Role and permission management with per-page grants
- Dynamic sidebar navigation (driven by database, filtered by role)
- Categories management (inventoriable / consumable)
- Locations management
- UOM (Units of Measure) management
- Payment Methods management (unique name + unique description, soft delete + restore)
- Payment Terms management (unique name + term days, default 0)
- Trans Type management (unique name, transaction type lookup)
- Stock Level (read-only current qty per product and location; filled by future transaction modules)
- Phar Stock Levels — `/phar-stock-levels` clone of stock levels filtered to location **pharmacy** only (no new table)
- Phar Stock Movements — `/phar-stock-movements` clone of stock movements filtered to **pharmacy** only (no new table)
- Stock Movement (read-only inventory trail: trans type, qty +/-, reference, remarks)
- Report Inventory — `/report-inventory` read-only balance report from `stock_movements` (Beg/In/Out/End by product×location); filters + PDF/Excel; no DB migration
- Report Low Stock — `/report-low-stock` locations where on-hand ≤ product min stock; Generate + PDF/Excel
- Report Near Expiry — `/report-near-expiry` lots expiring within N days (default 30) + expired; Generate + PDF/Excel
- FEFO inventory — lots in `inventory_batches`; receiving posts batch/expiry; releasing Complete auto-allocates earliest expiry (`lib/fefo.ts`); optional batch pick on release; `npm run db:truncate-inventory` resets stock history
- Receivings — list `/receivings` (**Trans #** `RCV-#####` is **clickable** → detail; list defaults to **Draft**). **Detail `/receivings/[id]`**: master info + items table (Batch #, UOM, Qty/Cost/Total `0.0000`); status actions **Back | Edit | Mark as Completed | Cancel / Print / Restore** on one row; toggle cancelled items; Print via shared `printDocumentPdf`.
- Releasings — list `/releasings` (**Trans #** `RLS-#####` **clickable** → detail; Draft default). **Detail `/releasings/[id]`**: from/to location + receiver + items (Series `RI-######`, UOM); **barcode scan auto-add** (`5*CODE`); same status actions + print layout as receivings (`RELEASING` / Released By).
- Transfers — list `/transfers` (**Trans #** `TRAN-#####` **clickable**; Draft default). **Detail `/transfers/[id]`**: both from/to locations **required**; items + scan auto-add (Series `TI-######`); Complete moves stock **from→to** on `stock_levels` only (**no** `products.stock` update); print via `printDocumentPdf` (TRANSFER).
- Adjustments — `/adjustments` single-line stock adj **`ADJ-#####`**; **UOM** from product (`uom_id` FK); `qty_new = qty_old + qty_adj`; Add modal shows **UOM + Old/New qty** after product pick; save posts **Completed** immediately; **View modal** (2-col layout; Product/Remarks full width) + Print; Cancel reverses stock sign; list defaults Completed.
- Conversions — `/conversions` product-to-product at one location **`CNV-#####`**; from/to UOM auto from products; save posts **Completed** (−qty from product, +qty to product on `stock_levels` + `products.stock` + `stock_movements` **Conversion**); from ≠ to product; View modal 2-col + Print; Cancel reverses; list defaults Completed.
- Phar Conversions — `/phar-conversions` clone of conversions filtered to location **pharmacy** only; form location locked; cancel only pharmacy docs (no new table)
- Phar Adjustments — `/phar-adjustments` clone of adjustments; list/create/cancel **pharmacy only**; form location locked (no new table)
- GST Types management
- Suppliers management (with audit trail)
- Products management (editable product codes with optional next-code prefill, required UOM + GST type FKs, optional category, stock/cost tracking)
- Multi-currency support (155 ISO 4217 currencies)
- Timezone-aware date display — **all dates shown as `YYYY-MM-DD`** (app timezone); date form/filter fields use a calendar **DatePicker** (`YYYY-MM-DD`, no manual typing)
- User display on inventory/receivings — **Created/Updated/Deleted By** shown as **`[lastname], [F].`** (`lib/format-user.ts` / `formatUserDisplay`)
- File upload with configurable storage (File System / Cloudinary)
- Application settings (logo, favicon, name, tagline, timezone, **address**, **phone**, currency, storage type) — used on document print headers (`printDocumentPdf`)
- Shared document print — **`lib/print/document-print.ts`** branded PDF layout for receivings, releasings, and future documents
- **Detail pages** for receivings/releasings — roles-style two-column layout (items + master info); **Back** on the action row; list **Trans #** navigates to detail
- Password management (change password, forgot/reset flow)
- **Audit fields** on all modules — createdBy, updatedBy, deletedBy, deletedReason (receivings use the same `deleted_*` columns; workflow status may be Draft/Completed/Cancelled)

## Tech Stack

- **Framework:** Next.js 16 (App Router + Turbopack)
- **UI:** React 19, Tailwind CSS 4
- **Database:** PostgreSQL + Drizzle ORM
- **Validation:** Zod + react-hook-form
- **Auth:** JWT (jsonwebtoken) + bcrypt
- **Icons:** Lucide React
- **Toasts:** Sonner

## Prerequisites

- Node.js 18+
- PostgreSQL

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env.local` and fill in your database credentials:
   ```bash
   cp .env.example .env.local
   ```
   | Variable | Required | Description |
   |---|---|---|
   | `DATABASE_URL` | yes | PostgreSQL connection string |
   | `JWT_SECRET` | no | JWT signing secret (dev falls back to a hardcoded key) |
   | `BYPASS_EMAIL` / `BYPASS_PASSWORD` | no | Emergency bypass login credential (see [Authentication](#authentication)); leave empty to disable |
4. Push the schema to your database:
   ```bash
   npm run db:push
   ```
5. Seed reference and RBAC data (**required before using the app**):
   ```bash
   npm run db:seed-rbac
   npm run db:seed-trans-types
   npm run db:seed-timezones
   npm run db:seed-currencies
   ```
   - `db:seed-rbac` seeds the `pages`, `permissions`, `roles`, and `role_permissions` tables (full sidebar menu + an `Admin` role with all permissions).
   - `db:seed-trans-types` seeds the `trans_types` rows the stock engine looks up by name (Receiving/Releasing/Transfer/Adjustment/Conversion + their Cancel counterparts) — completing or cancelling stock documents fails without them.

   All seeds are idempotent — safe to re-run.
6. Start the dev server:
   ```bash
   npm run dev
   ```
7. Open [http://localhost:3000](http://localhost:3000)

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema changes directly to database |
| `npm run db:generate` | Generate migration files from schema changes |
| `npm run db:migrate` | Apply pending migration files to database |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |
| `npm run db:seed-rbac` | Seed RBAC tables (pages, permissions, roles, role_permissions) — required before first use |
| `npm run db:seed-trans-types` | Seed trans types required by stock posting (Receiving/Releasing/Transfer/Adjustment/Conversion + Cancels) |
| `npm run db:seed-timezones` | Seed timezone table |
| `npm run db:seed-currencies` | Seed currency table |
| `npm run db:seed-phar-conversions-page` | Seed the Phar Conversions menu page + grants |
| `npm run db:truncate-inventory` | Truncate stock docs/movements/lots/levels; reset `products.stock` to 0 (keeps masters) |

## Project Structure

```
app/
├── (admin)/              # Protected admin pages (with sidebar layout)
│   ├── categories/
│   ├── departments/
│   ├── gst-types/
│   ├── locations/
│   ├── pages/
│   ├── permissions/
│   ├── products/          # + [id] detail
│   ├── receivings/        # list + [id] detail (items, complete/print)
│   ├── releasings/        # list + [id] detail (items, scan, print)
│   ├── roles/             # + [id] detail (permissions)
│   ├── settings-application/
│   ├── settings-cloudinary/
│   ├── settings-mail/
│   ├── settings-sms/
│   ├── stock-levels/      # read-only qty by product/location
│   ├── stock-movements/   # read-only inventory trail
│   ├── suppliers/
│   ├── transfers/         # list + [id] detail
│   ├── trans-types/
│   ├── adjustments/       # list + view/cancel modals
│   ├── conversions/       # list + view/cancel modals
│   ├── payment-methods/
│   ├── payment-terms/
│   ├── report-inventory/  # FEFO balance report (Generate + PDF/Excel header)
│   ├── uoms/
│   └── users/
├── (auth)/               # Public auth pages
│   ├── login/
│   ├── forgot-password/
│   └── reset-password/
├── api/                  # API routes
│   ├── auth/             # Login, register, refresh, logout, me, change-password
│   ├── categories/
│   ├── currencies/       # Currency lookup (auth-only)
│   ├── departments/
│   ├── gst-types/
│   ├── locations/
│   ├── pages/
│   ├── permissions/
│   ├── products/
│   ├── roles/
│   ├── role-permissions/
│   ├── settings-application/
│   ├── settings-cloudinary/
│   ├── settings-mail/
│   ├── settings-sms/
│   ├── suppliers/
│   ├── timezones/
│   ├── uoms/
│   ├── upload/
│   ├── users/
│   ├── inventory-batches/   # open lots for FEFO pick
│   ├── report-inventory/    # aggregate GET only
│   ├── releasings/preview-fefo/
│   ├── adjustments/
│   ├── conversions/
│   ├── receivings/
│   ├── releasings/
│   ├── transfers/
│   ├── stock-levels/
│   └── stock-movements/
├── layout.tsx            # Root layout
└── favicon.ico/          # Dynamic favicon route
components/
├── adjustments/
├── auth/                 # Login form, change password modal, profile modal
├── categories/
├── conversions/
├── departments/
├── gst-types/
├── layout/               # Sidebar, navbar, breadcrumb
├── locations/
├── pages/
├── payment-methods/
├── payment-terms/
├── permissions/
├── products/
├── receivings/           # list + [id] detail
├── receiving-items/
├── releasings/
├── releasing-items/
├── report-inventory/     # FEFO-era balance report UI
├── role-permissions/
├── roles/
├── settings-application/
├── settings-cloudinary/
├── settings-mail/
├── settings-sms/
├── stock-levels/
├── stock-movements/
├── suppliers/
├── transfers/
├── transfer-items/
├── trans-types/
├── ui/                   # Reusable UI components (button, input, dialog, table, etc.)
├── uoms/
└── users/
lib/
├── api-auth.ts           # requirePermission, requireAuth, requirePageRead helpers
├── api-client.ts         # apiFetch wrapper (attaches Bearer token)
├── auth.ts               # JWT generation/verification, bcrypt helpers
├── datetime.ts           # Pure date formatting — formatDateOnly → YYYY-MM-DD (no db imports)
├── format-user.ts        # formatUserDisplay → [lastname], [F]. (e.g. Doe, J.)
├── db/
│   ├── index.ts          # Drizzle database client
│   └── schema.ts         # All table schemas
├── permissions.ts        # Cached RBAC permission lookups (30s TTL)
├── print/
│   └── document-print.ts # Shared branded PDF + drawCompanyHeader (list/report headers)
├── fefo.ts               # Lot helpers: upsertInventoryBatch, consumeFefo, previewFefo
├── receiving-stock.ts    # Receivings complete/cancel — lots + stock_levels + products.stock
├── releasing-stock.ts    # Releasings complete/cancel — FEFO allocate/reverse
├── transfer-stock.ts     # Transfers complete/cancel — FEFO from→to lots
├── adjustment-stock.ts   # Adjustments save/cancel — lot in/out
├── conversion-stock.ts   # Conversions save/cancel — lot consume/create
├── receivings.ts         # Trans #/batch helpers, re-export formatUserDisplay
├── settings.ts           # Cached app settings + getAppTimezone(); address/phone for print headers
├── utils.ts              # cn() utility for classnames
└── validations/          # Zod schemas per module
    ├── auth.ts
    ├── category.ts
    ├── department.ts
    ├── gst-type.ts
    ├── location.ts
    ├── page.ts
    ├── permission.ts
    ├── product.ts
    ├── role.ts
    ├── role-permission.ts
    ├── settings-application.ts
    ├── settings-cloudinary.ts
    ├── settings-mail.ts
    ├── settings-sms.ts
    ├── supplier.ts
    ├── uom.ts
    └── user.ts
proxy.ts                  # Next.js 16 middleware (auth gate)
drizzle/                  # Database migration files
scripts/                  # Seed scripts + truncate-inventory.ts (npm run db:truncate-inventory)
```

## Architecture

### Authentication

- **Access tokens** (JWT, 15 min expiry) stored in `localStorage` + readable `accessToken` cookie (for SSR page guards)
- **Refresh tokens** (JWT, 7 days) stored in httpOnly cookies
- `proxy.ts` acts as middleware — checks auth on every request and redirects unauthenticated users to `/login`

#### Bypass credential (emergency login)

Set `BYPASS_EMAIL` and `BYPASS_PASSWORD` in `.env.local` to enable a fallback login with **all access**. Authentication order: **database first** (normal user lookup + password check) — only if that fails do the submitted credentials get compared against the env pair.

Useful on a freshly cloned machine where the `users` table is empty or the admin password is unknown. Behavior:

- Logs in as **Bypass Admin** without any `users` row; the session is a normal JWT with a `bypass` claim (7-day session via the refresh cookie; refresh tokens are not persisted to the DB).
- **All access**: every `requirePermission` / `requirePageRead` check passes and the sidebar lists **all Active pages** — no roles or `role_permissions` rows needed. (The sidebar is still driven by the `pages` table; run `npm run db:seed-rbac` if it is empty.)
- Audit columns (`created_by`, `updated_by`, `deleted_by`) are stored as `NULL` for bypass actions.
- Profile edit and change-password are rejected for bypass sessions (`400 Not available for bypass user`).
- **Security**: leave the vars empty in production, or treat them as a root secret — anyone holding the pair has full access whenever database auth fails.

### RBAC Enforcement

Permissions are enforced at three levels:

| Level | Mechanism | Permission |
|---|---|---|
| Sidebar menu | `/api/pages?mine=1` filters by role's View grants | View |
| Page access | `requirePageRead("/path")` in server component → 404 | View |
| API routes | `requirePermission(request, "/path", "Permission")` → 401/403 | Read/Add/Edit/Delete/Restore/Export/Clone |

Permission names: `View, Read, Add, Edit, Delete, Restore, Export, Clone`. The two read-style permissions differ:

- **`Read`** — read the API only (no sidebar entry, page UI not reachable)
- **`View`** — read the API **and** display the page in the sidebar / open the page UI (superset of `Read`: a `View` grant also satisfies API reads)

Permission data lives in `role_permissions` (roleId, pageId, permissionId). Cached 30s per role in `lib/permissions.ts`. Cache invalidated on role-permission mutations.

### Audit Fields

All soft-deletable module tables track who did what:

| Field | Type | Set on |
|---|---|---|
| `createdBy` | `bigint({ mode: "number" })` FK → users.id | POST (from logged-in user) |
| `updatedBy` | `bigint({ mode: "number" })` FK → users.id | PUT and PATCH restore |
| `deletedBy` | `bigint({ mode: "number" })` FK → users.id | DELETE (cleared on restore) |
| `deletedReason` | text | DELETE from optional `{ reason }` body (cleared on restore) |

The `requirePermission()` helper returns `AuthUser` with `userId` — API routes use `auth.userId` to populate these fields.

### Route Groups

- `(admin)` — Protected pages wrapped with sidebar/navbar layout
- `(auth)` — Public pages (login, forgot-password, reset-password)

### Dynamic Sidebar

The sidebar navigation is built from the `pages` table in the database. Add a row to `pages` to add a new menu item. Parent/child relationships create nested submenus.

### File Uploads

Configurable via `/settings-application`:
- **File System** (default) — files saved to `public/uploads/`
- **Cloudinary** — files uploaded to Cloudinary cloud storage (requires configuration at `/settings-cloudinary`)

### App Settings

The app logo, favicon, name, and storage type are all configurable from `/settings-application` and stored in the `settings_app` table.

---

## How to Add a New Module

See **`MODULE_CREATION.md`** for the full step-by-step guide with naming conventions, code templates, and checklist.

Quick overview:
1. Add table to `lib/db/schema.ts` — use `bigserial("id", { mode: "number" })` for PKs, `bigint("col", { mode: "number" })` for FKs, `timestamp({ withTimezone: true, mode: "date" })` for timestamps. Include audit fields (createdBy, updatedBy, deletedBy, deletedReason). Display dates with `formatDateOnly`; user audit fields in UI with `formatUserDisplay`; date inputs with `DatePicker`.
2. Create `lib/validations/<singular>.ts` (zod schemas)
3. Create `app/api/<plural>/route.ts` + `[id]/route.ts` (with `requirePermission` calls, set audit fields from `auth.userId`)
4. Create `components/<plural>/` (columns, table, form modal, delete modal, search modal) — modal shell: `DialogContent` `flex max-h-[90vh] flex-col p-0` + `showCloseButton={false}`; body `min-h-0 flex-1 overflow-y-auto` so header/footer stay pinned
5. Create `app/(admin)/<plural>/page.tsx` (with `requirePageRead` guard)
6. Insert row into `pages` table for sidebar registration
7. Grant View on parent page + Read on new page for roles that should access it

---

## Contributing

1. Create a feature branch from `main`
2. Follow the existing patterns: schema → validation → API (with `requirePermission`) → component → page (with `requirePageRead`)
3. Run `npm run lint` before committing
4. Use soft deletes (`status: "Deleted"`) — never hard delete records
5. All API routes require Bearer token auth unless added to `PUBLIC_API_ROUTES` in `proxy.ts`
