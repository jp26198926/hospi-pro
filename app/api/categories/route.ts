import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { categorySchema } from "@/lib/validations/category";
import { eq, desc, asc, ilike, and, ne, or, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/categories", "Read");
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const status = searchParams.get("status") || "all";
    const type = searchParams.get("type") || "all";

    const conditions = [];
    if (status === "Active") {
      conditions.push(eq(categories.status, "Active"));
    } else if (status === "Deleted") {
      conditions.push(eq(categories.status, "Deleted"));
    }
    if (type === "inventoriable" || type === "consumable") {
      conditions.push(eq(categories.type, type));
    }
    if (search) {
      conditions.push(
        or(ilike(categories.name, `%${search}%`), ilike(categories.description, `%${search}%`))
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "name"
        ? categories.name
        : sortBy === "type"
          ? categories.type
          : sortBy === "updatedAt"
            ? categories.updatedAt
            : sortBy === "status"
              ? categories.status
              : categories.createdAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(categories)
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: drizzleCount() }).from(categories).where(where),
    ]);

    const total = countResult[0]?.value ?? 0;

    return Response.json({ data, total, page, limit });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return Response.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/categories", "Add");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = categorySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.name, parsed.data.name), ne(categories.status, "Deleted")));

    if (existing) {
      return Response.json({ error: "Category already exists" }, { status: 409 });
    }

    const [data] = await db.insert(categories).values(parsed.data).returning();

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/categories error:", error);
    return Response.json({ error: "Failed to create category" }, { status: 500 });
  }
}
