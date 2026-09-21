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
- Stock Movement (read-only inventory trail: trans type, qty +/-, reference, remarks)
- Report Inventory — `/report-inventory` read-only balance report from `stock_movements` (Beg/In/Out/End by product×location); filters + PDF/Excel; no DB migration
- Receivings — list `/receivings` (**Trans #** `RCV-#####` is **clickable** → detail; list defaults to **Draft**). **Detail `/receivings/[id]`**: master info + items table (Batch #, UOM, Qty/Cost/Total `0.0000`); status actions **Back | Edit | Mark as Completed | Cancel / Print / Restore** on one row; toggle cancelled items; Print via shared `printDocumentPdf`.
- Releasings — list `/releasings` (**Trans #** `RLS-#####` **clickable** → detail; Draft default). **Detail `/releasings/[id]`**: from/to location + receiver + items (Series `RI-######`, UOM); **barcode scan auto-add** (`5*CODE`); same status actions + print layout as receivings (`RELEASING` / Released By).
- Transfers — list `/transfers` (**Trans #** `TRAN-#####` **clickable**; Draft default). **Detail `/transfers/[id]`**: both from/to locations **required**; items + scan auto-add (Series `TI-######`); Complete moves stock **from→to** on `stock_levels` only (**no** `products.stock` update); print via `printDocumentPdf` (TRANSFER).
- Adjustments — `/adjustments` single-line stock adj **`ADJ-#####`**; **UOM** from product (`uom_id` FK); `qty_new = qty_old + qty_adj`; Add modal shows **UOM + Old/New qty** after product pick; save posts **Completed** immediately; **View modal** (2-col layout; Product/Remarks full width) + Print; Cancel reverses stock sign; list defaults Completed.
- Conversions — `/conversions` product-to-product at one location **`CNV-#####`**; from/to UOM auto from products; save posts **Completed** (−qty from product, +qty to product on `stock_levels` + `products.stock` + `stock_movements` **Conversion**); from ≠ to product; View modal 2-col + Print; Cancel reverses; list defaults Completed.
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
4. Push the schema to your database:
   ```bash
   npm run db:push
   ```
5. Seed timezone and currency data:
   ```bash
   npm run db:seed-timezones
   npm run db:seed-currencies
   ```
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
| `npm run db:seed-timezones` | Seed timezone table |
| `npm run db:seed-currencies` | Seed currency table |

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
│   └── users/
├── layout.tsx            # Root layout
└── favicon.ico/          # Dynamic favicon route
components/
├── auth/                 # Login form, change password modal, profile modal
├── categories/
├── departments/
├── gst-types/
├── layout/               # Sidebar, navbar, breadcrumb
├── locations/
├── pages/
├── permissions/
├── products/
├── role-permissions/
├── roles/
├── settings-application/
├── settings-cloudinary/
├── settings-mail/
├── settings-sms/
├── suppliers/
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
│   └── document-print.ts # Shared branded PDF layout (receivings/releasings/future)
├── receiving-stock.ts    # Receivings complete/cancel stock posting (db.transaction)
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
scripts/                  # Seed scripts (seed-timezones, seed-currencies)
```

## Architecture

### Authentication

- **Access tokens** (JWT, 15 min expiry) stored in `localStorage` + readable `accessToken` cookie (for SSR page guards)
- **Refresh tokens** (JWT, 7 days) stored in httpOnly cookies
- `proxy.ts` acts as middleware — checks auth on every request and redirects unauthenticated users to `/login`

### RBAC Enforcement

Permissions are enforced at three levels:

| Level | Mechanism | Permission |
|---|---|---|
| Sidebar menu | `/api/pages?mine=1` filters by role's View grants | View |
| Page access | `requirePageRead("/path")` in server component → 404 | Read |
| API routes | `requirePermission(request, "/path", "Permission")` → 401/403 | Read/Add/Edit/Delete/Restore/Export/Clone |

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
