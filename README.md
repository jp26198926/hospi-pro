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
- GST Types management
- Suppliers management (with audit trail)
- Products management (editable product codes with optional next-code prefill, required UOM + GST type FKs, optional category, stock/cost tracking)
- Multi-currency support (155 ISO 4217 currencies)
- Timezone-aware date display (configurable per app)
- File upload with configurable storage (File System / Cloudinary)
- Application settings (logo, favicon, name, timezone, currency, storage type)
- Password management (change password, forgot/reset flow)
- **Audit fields** on all modules — createdBy, updatedBy, deletedBy, deletedReason

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
│   ├── products/
│   ├── roles/
│   ├── settings-application/
│   ├── settings-cloudinary/
│   ├── settings-mail/
│   ├── settings-sms/
│   ├── suppliers/
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
├── datetime.ts           # Pure date formatting (no db imports)
├── db/
│   ├── index.ts          # Drizzle database client
│   └── schema.ts         # All table schemas
├── permissions.ts        # Cached RBAC permission lookups (30s TTL)
├── settings.ts           # Cached app settings + getAppTimezone()
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
1. Add table to `lib/db/schema.ts` — use `bigserial("id", { mode: "number" })` for PKs, `bigint("col", { mode: "number" })` for FKs, `timestamp({ withTimezone: true, mode: "date" })` for timestamps. Include audit fields (createdBy, updatedBy, deletedBy, deletedReason).
2. Create `lib/validations/<singular>.ts` (zod schemas)
3. Create `app/api/<plural>/route.ts` + `[id]/route.ts` (with `requirePermission` calls, set audit fields from `auth.userId`)
4. Create `components/<plural>/` (columns, table, form modal, delete modal, search modal)
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
