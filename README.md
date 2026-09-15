# RBAC System

Role-Based Access Control system built with Next.js 16, Drizzle ORM, and PostgreSQL.

## Features

- JWT authentication (access + refresh tokens)
- Role and permission management
- Dynamic sidebar navigation (driven by database)
- File upload with configurable storage (File System / Cloudinary)
- Application settings (logo, favicon, name, storage type)
- Password management (change password, forgot/reset flow)

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
5. Seed timezone data:
   ```bash
   npm run db:seed-timezones
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

## Project Structure

```
app/
├── (admin)/              # Protected admin pages (with sidebar layout)
│   ├── departments/
│   ├── pages/
│   ├── permissions/
│   ├── roles/
│   ├── settings-application/
│   ├── settings-cloudinary/
│   ├── settings-mail/
│   ├── settings-sms/
│   └── users/
├── (auth)/               # Public auth pages
│   ├── login/
│   ├── forgot-password/
│   └── reset-password/
├── api/                  # API routes
│   ├── auth/             # Login, register, refresh, logout, me, change-password
│   ├── departments/
│   ├── pages/
│   ├── permissions/
│   ├── roles/
│   ├── role-permissions/
│   ├── settings-application/
│   ├── settings-cloudinary/
│   ├── settings-mail/
│   ├── settings-sms/
│   ├── timezones/
│   ├── upload/
│   └── users/
├── layout.tsx            # Root layout
└── favicon.ico/          # Dynamic favicon route
components/
├── auth/                 # Login form, change password modal, profile modal
├── departments/
├── layout/               # Sidebar, navbar, breadcrumb
├── pages/
├── permissions/
├── role-permissions/
├── roles/
├── settings-application/
├── settings-cloudinary/
├── settings-mail/
├── settings-sms/
├── ui/                   # Reusable UI components (button, input, dialog, table, etc.)
└── users/
lib/
├── auth.ts               # JWT generation/verification, bcrypt helpers
├── db/
│   ├── index.ts          # Drizzle database client
│   └── schema.ts         # All table schemas
├── settings.ts           # Cached app settings helper
├── utils.ts              # cn() utility for classnames
└── validations/          # Zod schemas per module
    ├── auth.ts
    ├── department.ts
    ├── page.ts
    ├── permission.ts
    ├── role.ts
    ├── role-permission.ts
    ├── settings-application.ts
    ├── settings-cloudinary.ts
    ├── settings-mail.ts
    ├── settings-sms.ts
    └── user.ts
proxy.ts                  # Next.js 16 middleware (auth gate)
drizzle/                  # Database migration files
scripts/                  # Seed scripts
```

## Architecture

### Authentication

- **Access tokens** (JWT, 15 min expiry) stored in `localStorage`
- **Refresh tokens** (JWT, 7 days) stored in httpOnly cookies
- `proxy.ts` acts as middleware — checks auth on every request and redirects unauthenticated users to `/login`

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

This guide walks through adding a new module (e.g., "Categories") step by step.

### Step 1: Database Schema

Add your table to `lib/db/schema.ts`:

```ts
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  category: text("category").notNull().unique(),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
```

Then push the schema:

```bash
npm run db:push
```

### Step 2: Validation Schema

Create `lib/validations/category.ts`:

```ts
import { z } from "zod";

export const categorySchema = z.object({
  category: z.string().min(1, "Category name is required").max(100),
});

export type CategoryInput = z.infer<typeof categorySchema>;
```

### Step 3: API Routes

Create `app/api/categories/route.ts`:

- `GET` — List all categories (with search, status filter, pagination)
- `POST` — Create a new category

Create `app/api/categories/[id]/route.ts`:

- `GET` — Get a single category
- `PUT` — Update a category
- `DELETE` — Soft delete (set status to `"Deleted"`)

Follow the pattern in existing routes like `app/api/departments/route.ts`.

### Step 4: UI Components

Create the following in `components/categories/`:

- **`categories-table.tsx`** — Data table with search, status filter, and action buttons (edit, delete, restore)
- **`category-form-modal.tsx`** — Create/edit modal form
- **`category-delete-modal.tsx`** — Delete confirmation modal

Follow the pattern in existing components like `components/departments/`.

### Step 5: Page

Create `app/(admin)/categories/page.tsx`:

```tsx
import { CategoriesTable } from "@/components/categories/categories-table";

export const metadata = {
  title: "Categories",
  description: "Manage system categories",
};

export default function CategoriesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Manage system categories.
          </p>
        </div>
      </div>

      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Categories Management
          </h2>
        </div>
        <div className="p-4">
          <CategoriesTable />
        </div>
      </div>
    </div>
  );
}
```

Create `app/(admin)/categories/layout.tsx`:

```tsx
export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

### Step 6: Register in Sidebar

The sidebar is dynamic — insert a row into the `pages` table:

```sql
INSERT INTO pages (page, path, icon, "order", status)
VALUES ('Categories', '/categories', 'folder', 5, 'Active');
```

Available icons: `home`, `settings`, `users`, `shield`, `file-text`, `bar-chart-3`, `calendar`, `mail`, `bell`, `search`, `layout-dashboard`, `lock`, `globe`, `heart`, `star`, `bookmark`, `tag`, `folder`, `image`, `video`, `music`, `phone`, `map-pin`, `shopping-cart`, `credit-card`.

### Step 7: Public API Routes (if needed)

If any of your API endpoints should be publicly accessible (no auth required), add them to `PUBLIC_API_ROUTES` in `proxy.ts`.

---

## Contributing

1. Create a feature branch from `main`
2. Follow the existing patterns: schema → validation → API → component → page
3. Run `npm run lint` before committing
4. Use soft deletes (`status: "Deleted"`) — never hard delete records
5. All API routes require Bearer token auth unless added to `PUBLIC_API_ROUTES` in `proxy.ts`
