# Module Creation Guide

How to add a new CRUD module to this RBAC app. Follow the steps in order.

**Reference modules**: `departments` (simple), `roles` (has clone modal + detail page with a child table), `products` (wide table, required FKs `uomId`/`gstTypeId`, editable unique code + next-code prefill, Created At omitted), `payment_methods` (simple text module with **dual unique fields** `name` + `description`, audit fields, Created At shown), `payment_terms` (unique `name` + integer `termDays` default 0 via `z.coerce.number()`, audit fields).

---

## Naming Conventions

Using `categories` as the example module:

| Layer | Convention | Example |
|---|---|---|
| DB table export | plural camelCase | `categories` |
| DB table name string | plural lowercase | `"categories"` |
| Domain field | singular | `category` (not `name`) |
| Zod validation file | **singular** | `lib/validations/category.ts` |
| Zod create schema | `<singular>Schema` | `categorySchema` |
| Zod update schema | `<singular>UpdateSchema` | `categoryUpdateSchema` |
| Zod input types | PascalCase | `CategoryInput`, `CategoryUpdateInput` |
| API route folder | **plural** | `app/api/categories/` |
| Admin page folder | **plural** | `app/(admin)/categories/` |
| Page component | plural PascalCase | `CategoriesPage` |
| Layout component | plural PascalCase | `CategoriesLayout` |
| Detail page component | singular PascalCase | `CategoryDetailPage` |
| Component folder | **plural** | `components/categories/` |
| Table file + export | **plural** | `categories-table.tsx` → `CategoriesTable` |
| Columns file | **plural** | `categories-columns.tsx` → `getColumns`, `Category` |
| Modal files + exports | **singular** | `category-form-modal.tsx` → `CategoryFormModal` |

---

## Workflow

### Step 1 — Database Schema

**File**: `lib/db/schema.ts` (append)

```ts
export const categories = pgTable("categories", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  category: text("category").notNull().unique(),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdBy: bigint("created_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedReason: text("deleted_reason"),
});
```

- Column DB names are snake_case; TS property names are camelCase.
- **All IDs use `bigserial("id", { mode: "number" })`** — the project is designed for large datasets.
- **All FK columns use `bigint("col", { mode: "number" })`** — `mode: "number"` ensures Drizzle returns JS `number`.
- Always include the soft-delete trio: `status`, `createdAt`, `updatedAt`, `deletedAt`.
- **Always include audit fields**: `createdBy`, `updatedBy`, `deletedBy` (FKs to `users.id`), `deletedReason` (text).
- **All timestamps must use** `timestamp("...", { withTimezone: true, mode: "date" })` — this stores `timestamptz` and avoids double-offset bugs.
- Reuse `commonStatusEnum` — do not create a new enum.

Then push:

```bash
npm run db:push
```

---

### Step 2 — Validation Schemas

**File**: `lib/validations/category.ts` (new)

```ts
import { z } from "zod";

export const categorySchema = z.object({
  category: z.string().min(1, "Category name is required").max(100),
});

export const categoryUpdateSchema = z.object({
  category: z.string().min(1, "Category name is required").max(100),
  status: z.enum(["Active", "Deleted"]).optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
```

- Create schema: domain fields only.
- Update schema: same fields + optional `status` enum.
- The form modal uses the **create** schema only.

---

### Step 3 — API List + Create

**File**: `app/api/categories/route.ts` (new)

Export `GET` and `POST`.

**Permission checks** — add as first line inside each `try` block:

```ts
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/categories", "Read");
    if (auth instanceof Response) return auth;
    // ... existing logic
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/categories", "Add");
    if (auth instanceof Response) return auth;
    // ... existing logic
  }
}
```

The `pagePath` argument must match the `path` column in the `pages` table (e.g. `"/categories"`).

**GET** — list with pagination/search/filter:
- Query params: `page` (default 1), `limit` (default 10, max 100), `search`, `sortBy` (default `createdAt`), `sortOrder` (default `desc`), `status` (`all` | `Active` | `Deleted`).
- Build a `conditions[]` array, combine with `and(...)` or `undefined`.
- Search with `ilike(categories.category, \`%${search}%\`)`.
- Use `Promise.all` for data + count (`select({ value: drizzleCount() })`).
- Response: `Response.json({ data, total, page, limit })`.

**POST** — create:
- Validate with `categorySchema.safeParse(body)` → 400 on failure.
- Uniqueness check: `and(eq(categories.category, value), ne(categories.status, "Deleted"))` → 409 if exists.
- Insert with `createdBy: auth.userId` → `Response.json({ data }, { status: 201 })`.

**User-editable unique codes** (if the domain has a code — see products/UOM):
- Zod: `z.string().trim().min(1, "Code is required").max(50, "Code must be at most 50 characters")` (adjust max to the module).
- POST uniqueness: `eq(table.code, value)` + `ne(status, "Deleted")` → 409.
- PUT uniqueness: same + `ne(table.id, selfId)`.
- Optional form prefill: `GET /api/<plural>/next-code` with `requirePermission(..., "/<parent>", "Read")` — **never** add helper routes to `PUBLIC_API_ROUTES`.

**Required FK columns** (if any — see products `uomId`/`gstTypeId`):
- Schema: `bigint("col_id", { mode: "number" }).notNull().references(() => other.id)`.
- Zod: `z.number().int().positive("X is required")`.
- Form: required `SearchableSelect` (no `allOption`; empty → `0` so validation fails).
- List/detail APIs: `leftJoin` + select `otherName: other.name`; include id + name on the list payload for the table/edit form.
- Grants: roles that open this module need **Read** on the FK module’s page path so form lookups succeed.

Copy `app/api/departments/route.ts` or `app/api/suppliers/route.ts` as the template.

---

### Step 4 — API Single Resource

**File**: `app/api/categories/[id]/route.ts` (new)

Export `GET`, `PUT`, `DELETE`, `PATCH`.

**Permission checks** — add as first line inside each `try` block:

```ts
const auth = await requirePermission(request, "/categories", "Read");    // GET
const auth = await requirePermission(request, "/categories", "Edit");    // PUT
const auth = await requirePermission(request, "/categories", "Delete");  // DELETE
const auth = await requirePermission(request, "/categories", "Restore"); // PATCH
if (auth instanceof Response) return auth;
```

**Params** (Next.js 16 — `params` is a Promise):

```ts
const { id } = await params;
const categoryId = parseInt(id);
if (isNaN(categoryId)) return Response.json({ error: "Invalid ID" }, { status: 400 });
```

| Method | Behavior | Response |
|---|---|---|
| `GET` | Find by id + `ne(status, "Deleted")`; 404 if missing | `{ data }` |
| `PUT` | Validate with create schema; uniqueness excluding self + Deleted; set `updatedAt: new Date(), updatedBy: auth.userId` | `{ data }` |
| `DELETE` | Soft delete: `{ status: "Deleted", deletedAt: new Date(), deletedBy: auth.userId, deletedReason: body.reason \|\| null }`. Accepts optional JSON body `{ reason }`. | `{ message }` |
| `PATCH` | Restore: find only `eq(status, "Deleted")` rows; set `{ status: "Active", deletedAt: null, deletedBy: null, deletedReason: null, updatedAt: new Date(), updatedBy: auth.userId }` | `{ data }` |

Copy `app/api/suppliers/[id]/route.ts` as the template (includes audit fields).

---

### Step 5 — Components

**Folder**: `components/categories/` (new)

Five files:

| File | Export | Role |
|---|---|---|
| `categories-columns.tsx` | `Category` (interface), `getColumns` | TanStack column defs |
| `categories-table.tsx` | `CategoriesTable` | Main client table orchestrator |
| `category-form-modal.tsx` | `CategoryFormModal` | Add/Edit dialog |
| `category-delete-modal.tsx` | `CategoryDeleteModal` | Soft-delete confirm dialog |
| `category-search-modal.tsx` | `CategorySearchModal` | Advanced Search dialog |

**`Category` interface** (in columns file):
```ts
export interface Category {
  id: number;
  category: string;
  status: "Active" | "Deleted";
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
}
```

**`getColumns`** signature:
```ts
export function getColumns({ onView, onEdit, onDelete, onRestore }: {
  onView: (row: Category) => void;
  onEdit: (row: Category) => void;
  onDelete: (row: Category) => void;
  onRestore: (row: Category) => void;
}): ColumnDef<Category>[]
```

Columns: `no` (#), domain field, `status` (badge), `createdAt`, `updatedAt`, `actions`.
**Created At rule**: count data columns only (exclude `#` and `Actions`). If more than 5 data columns, omit `createdAt` from the DataTable `getColumns()`. `#` and `actions` always stay. Status and domain fields count toward the total.
Actions: green Eye + blue Pencil + red Trash2 (Active) **or** orange RotateCcw (Deleted).

**`CategoriesTable`** handles:
- `fetchData` via `useCallback` hitting `GET /api/categories` with URLSearchParams.
- State: `data`, `total`, `page`, `limit`, `sorting`, `loading`, `search`, `statusFilter`, modal open/mode/entity.
- `handleRestore` is an **inline PATCH** — there is no restore modal.
- PDF export (`jspdf` + `jspdf-autotable`) and Excel export (`xlsx`).
- Toolbar: Add, Advanced Search, PDF, Excel (`flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`).
- Desktop table `hidden md:block`; mobile cards `md:hidden`.
- Pagination: limit Select (10/25/50/100), windowed page buttons (max 5).
- Renders all three modals at the bottom.

**Modal props**:
```ts
// FormModal
{ open, onOpenChange, mode: "add" | "edit", category: Category | null, onSuccess }
// DeleteModal
{ open, onOpenChange, category: Category | null, onSuccess }
// SearchModal
{ open, onOpenChange, onSearch: (term: string, status: string) => void }
```

Copy `components/departments/` as the template.

---

### Step 6 — Pages

**Folder**: `app/(admin)/categories/` (new)

**`layout.tsx`** — passthrough:
```tsx
export default function CategoriesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

**`page.tsx`** — index page:

Add `requirePageRead` as the first line — shows 404 if the user lacks Read permission:

```tsx
import { CategoriesTable } from "@/components/categories/categories-table";
import { requirePageRead } from "@/lib/api-auth";

export const metadata = {
  title: "Categories",
  description: "Manage system categories",
};

export default async function CategoriesPage() {
  await requirePageRead("/categories");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[#337ab7]">Categories</h1>
        <p className="text-sm text-muted-foreground">Manage system categories.</p>
      </div>
      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">Categories Management</h2>
        </div>
        <div className="p-4">
          <CategoriesTable />
        </div>
      </div>
    </div>
  );
}
```

**Optional `[id]/page.tsx`** — detail page (server component):
- `await requirePageRead("/<path>")` as first line (same Read guard as index page).
- `generateMetadata` queries DB for dynamic title.
- `await params`, `notFound()` on invalid/missing.
- Direct DB query (no API fetch).
- Ace Admin card + `dl` grid; status badge.
- Dates via `formatDateTimeLong(date, tz)` from `lib/datetime.ts` — fetch timezone with `const tz = await getAppTimezone()` from `lib/settings.ts`.
- Back button links to `/<plural>`.

**Timezone prop for tables**: if your table displays dates, pass timezone from the page:

```tsx
import { getAppTimezone } from "@/lib/settings";

export default async function CategoriesPage() {
  await requirePageRead("/categories");
  const timezone = await getAppTimezone();
  return (/* ... */ <CategoriesTable timezone={timezone} />);
}
```

Table components use `formatDateTime(date, timezone)` from `lib/datetime.ts` for card views and exports.

---

### Step 7 — Sidebar Registration

Insert a row into the `pages` table:

```sql
INSERT INTO pages (page, path, icon, "order", status)
VALUES ('Categories', '/categories', 'folder', 5, 'Active');
```

Available icon keys (mapped in `components/layout/sidebar.tsx`):
`home`, `settings`, `users`, `shield`, `file-text`, `bar-chart-3`, `calendar`, `mail`, `bell`, `search`, `layout-dashboard`, `lock`, `globe`, `heart`, `star`, `bookmark`, `tag`, `folder`, `image`, `video`, `music`, `phone`, `map-pin`, `shopping-cart`, `credit-card`.

- `parentId` = null for top-level; set to a parent's id for nested submenu.
- `path` must match the `(admin)` route folder.
- `order` controls sort (ascending, null last).
- **Parent pages need a View grant** for children to appear in the sidebar. If the new page has a parent, ensure the role also has View on the parent page's row in `pages`.

---

### Step 8 — Public API Routes (if needed)

If any endpoint must be accessible without auth, add its path to `PUBLIC_API_ROUTES` in `proxy.ts`. Most modules do not need this.

**Do not** put module helper/prefill routes (e.g. `next-code`) in `PUBLIC_API_ROUTES` — they stay behind `requirePermission` on the parent page path.

---

## Checklist

- [ ] `lib/db/schema.ts` — add table (timestamps with `withTimezone: true` + audit fields); required FKs use `bigint(...).notNull().references(...)`
- [ ] `npm run db:push`
- [ ] `lib/validations/<singular>.ts` — create; include `code` max length if user-editable; required FKs as `int().positive(...)`
- [ ] `app/api/<plural>/route.ts` — GET (requirePermission Read) + POST (requirePermission Add, set `createdBy: auth.userId`); unique code/FK handling as needed
- [ ] `app/api/<plural>/[id]/route.ts` — GET (Read) + PUT (Edit, set `updatedBy`) + DELETE (Delete, set `deletedBy`/`deletedReason`) + PATCH (Restore, clear audit fields)
- [ ] Optional helper e.g. `app/api/<plural>/next-code/route.ts` — parent `requirePermission` only; not in `PUBLIC_API_ROUTES`
- [ ] `components/<plural>/<plural>-columns.tsx` — apply Created At rule: if data columns (excluding `#` and Actions) > 5, omit `createdAt` column; join/display FK `*Name` columns as needed
- [ ] `components/<plural>/<plural>-table.tsx` (accepts `timezone` prop if showing dates)
- [ ] `components/<plural>/<singular>-form-modal.tsx` — SearchableSelect for FKs; required FKs without `allOption`
- [ ] `components/<plural>/<singular>-delete-modal.tsx` (with optional reason input)
- [ ] `components/<plural>/<singular>-search-modal.tsx`
- [ ] `app/(admin)/<plural>/layout.tsx`
- [ ] `app/(admin)/<plural>/page.tsx` (with `requirePageRead` guard + timezone prop)
- [ ] Optional: `app/(admin)/<plural>/[id]/page.tsx` (with `requirePageRead` + `formatDateTimeLong`)
- [ ] Insert row into `pages` table for sidebar
- [ ] Grant View on parent page + View/Read on new page for roles that need access
- [ ] Grant **Read** on FK lookup pages (e.g. `/uoms`) for roles that open this module’s forms
- [ ] `npm run lint` + `npx tsc --noEmit`

---

## Gotchas

- **Soft delete only** — never hard delete. Uniqueness checks must exclude Deleted rows (`ne(status, "Deleted")`).
- **Audit fields**: all modules must include `createdBy`, `updatedBy`, `deletedBy`, `deletedReason`. Set them from `auth.userId` returned by `requirePermission`. DELETE accepts optional `{ reason }` body. PATCH restore clears `deletedBy` and `deletedReason`.
- **Restore is inline PATCH** from the table action buttons — there is no restore modal component.
- **PUT uses the create schema** (`<singular>Schema`), not the update schema. Status is never sent from forms.
- **`params` is a Promise** in Next.js 16 — always `await params` in pages and route handlers.
- **All timestamps** must use `timestamp("...", { withTimezone: true, mode: "date" })` — bare `timestamp()` causes double timezone offset bugs.
- **Permission checks**: every API handler needs `requirePermission`; every page needs `requirePageRead`. Use the `pages` table `path` as the pagePath argument.
- **`lib/datetime.ts` must stay pure** (no db/server imports) — client components import from it.
- **FK dropdowns**: use `SearchableSelect` (`components/ui/searchable-select.tsx`), not base-ui `Select`. Use base-ui `Select` only for simple non-ID values (e.g. status All/Active/Deleted). Required FKs: no `allOption`; empty value → `0` so zod `.positive()` fails.
- **FK form lookups**: forms fetch FK list APIs — grant role **Read** on those page paths (products needs `/categories`, `/gst-types`, `/uoms`) or dropdowns stay empty.
- **Unique user-editable codes**: validate max length; POST/PUT uniqueness excluding Deleted (PUT also excludes self). Helper prefill endpoints stay authenticated under the parent page path — not in `PUBLIC_API_ROUTES`.
- **Toast**: `import { toast } from "sonner"` — not from `components/ui/sonner`.
- **Mobile**: table `hidden md:block`, cards `md:hidden`. All modals must trigger from both layouts.
- **Exports**: include the status column in both PDF and Excel.
- **Created At column**: if more than 5 data columns (exclude `#` and Actions), omit Created At from the DataTable. Products is the wide-table reference. Existing narrow modules (roles, departments) keep Created At.
