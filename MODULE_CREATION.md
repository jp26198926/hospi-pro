# Module Creation Guide

How to add a new CRUD module to this RBAC app. Follow the steps in order.

**Reference modules**: `departments` (simple), `roles` (has clone modal + detail page with a child table).

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
  id: serial("id").primaryKey(),
  category: text("category").notNull().unique(),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});
```

- Column DB names are snake_case; TS property names are camelCase.
- Always include the soft-delete trio: `status`, `createdAt`, `updatedAt`, `deletedAt`.
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

**GET** — list with pagination/search/filter:
- Query params: `page` (default 1), `limit` (default 10, max 100), `search`, `sortBy` (default `createdAt`), `sortOrder` (default `desc`), `status` (`all` | `Active` | `Deleted`).
- Build a `conditions[]` array, combine with `and(...)` or `undefined`.
- Search with `ilike(categories.category, \`%${search}%\`)`.
- Use `Promise.all` for data + count (`select({ value: drizzleCount() })`).
- Response: `Response.json({ data, total, page, limit })`.

**POST** — create:
- Validate with `categorySchema.safeParse(body)` → 400 on failure.
- Uniqueness check: `and(eq(categories.category, value), ne(categories.status, "Deleted"))` → 409 if exists.
- Insert `.returning()` → `Response.json({ data }, { status: 201 })`.

Copy `app/api/departments/route.ts` as the template.

---

### Step 4 — API Single Resource

**File**: `app/api/categories/[id]/route.ts` (new)

Export `GET`, `PUT`, `DELETE`, `PATCH`.

**Params** (Next.js 16 — `params` is a Promise):

```ts
const { id } = await params;
const categoryId = parseInt(id);
if (isNaN(categoryId)) return Response.json({ error: "Invalid ID" }, { status: 400 });
```

| Method | Behavior | Response |
|---|---|---|
| `GET` | Find by id + `ne(status, "Deleted")`; 404 if missing | `{ data }` |
| `PUT` | Validate with create schema; uniqueness excluding self + Deleted; set `updatedAt: new Date()` | `{ data }` |
| `DELETE` | Soft delete: `{ status: "Deleted", deletedAt: new Date() }` | `{ message }` |
| `PATCH` | Restore: find only `eq(status, "Deleted")` rows; set `{ status: "Active", deletedAt: null, updatedAt: new Date() }` | `{ data }` |

Copy `app/api/departments/[id]/route.ts` as the template.

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
```tsx
import { CategoriesTable } from "@/components/categories/categories-table";

export const metadata = {
  title: "Categories",
  description: "Manage system categories",
};

export default function CategoriesPage() {
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
- `generateMetadata` queries DB for dynamic title.
- `await params`, `notFound()` on invalid/missing.
- Direct DB query (no API fetch).
- Ace Admin card + `dl` grid; status badge; dates via `date-fns` `format`.
- Back button links to `/<plural>`.

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

---

### Step 8 — Public API Routes (if needed)

If any endpoint must be accessible without auth, add its path to `PUBLIC_API_ROUTES` in `proxy.ts`. Most modules do not need this.

---

## Checklist

- [ ] `lib/db/schema.ts` — add table
- [ ] `npm run db:push`
- [ ] `lib/validations/<singular>.ts` — create
- [ ] `app/api/<plural>/route.ts` — GET + POST
- [ ] `app/api/<plural>/[id]/route.ts` — GET + PUT + DELETE + PATCH
- [ ] `components/<plural>/<plural>-columns.tsx`
- [ ] `components/<plural>/<plural>-table.tsx`
- [ ] `components/<plural>/<singular>-form-modal.tsx`
- [ ] `components/<plural>/<singular>-delete-modal.tsx`
- [ ] `components/<plural>/<singular>-search-modal.tsx`
- [ ] `app/(admin)/<plural>/layout.tsx`
- [ ] `app/(admin)/<plural>/page.tsx`
- [ ] Optional: `app/(admin)/<plural>/[id]/page.tsx`
- [ ] Insert row into `pages` table for sidebar
- [ ] `npm run lint`

---

## Gotchas

- **Soft delete only** — never hard delete. Uniqueness checks must exclude Deleted rows (`ne(status, "Deleted")`).
- **Restore is inline PATCH** from the table action buttons — there is no restore modal component.
- **PUT uses the create schema** (`<singular>Schema`), not the update schema. Status is never sent from forms.
- **`params` is a Promise** in Next.js 16 — always `await params` in pages and route handlers.
- **FK dropdowns**: use `SearchableSelect` (`components/ui/searchable-select.tsx`), not base-ui `Select`. Use base-ui `Select` only for simple non-ID values (e.g. status All/Active/Deleted).
- **Toast**: `import { toast } from "sonner"` — not from `components/ui/sonner`.
- **Mobile**: table `hidden md:block`, cards `md:hidden`. All modals must trigger from both layouts.
- **Exports**: include the status column in both PDF and Excel.
