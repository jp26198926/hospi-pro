import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";
import { supplierSchema } from "@/lib/validations/supplier";
import { eq, desc, asc, ilike, and, ne, or, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/suppliers", "Read");
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const status = searchParams.get("status") || "all";

    const conditions = [];
    if (status === "Active") {
      conditions.push(eq(suppliers.status, "Active"));
    } else if (status === "Deleted") {
      conditions.push(eq(suppliers.status, "Deleted"));
    }
    if (search) {
      conditions.push(
        or(
          ilike(suppliers.name, `%${search}%`),
          ilike(suppliers.contactPerson, `%${search}%`),
          ilike(suppliers.email, `%${search}%`)
        )
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "name"
        ? suppliers.name
        : sortBy === "contactPerson"
          ? suppliers.contactPerson
          : sortBy === "email"
            ? suppliers.email
            : sortBy === "updatedAt"
              ? suppliers.updatedAt
              : sortBy === "status"
                ? suppliers.status
                : suppliers.createdAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(suppliers)
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: drizzleCount() }).from(suppliers).where(where),
    ]);

    const total = countResult[0]?.value ?? 0;

    return Response.json({ data, total, page, limit });
  } catch (error) {
    console.error("GET /api/suppliers error:", error);
    return Response.json({ error: "Failed to fetch suppliers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/suppliers", "Add");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = supplierSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.name, parsed.data.name), ne(suppliers.status, "Deleted")));

    if (existing) {
      return Response.json({ error: "Supplier already exists" }, { status: 409 });
    }

    const [data] = await db
      .insert(suppliers)
      .values({
        name: parsed.data.name,
        contactPerson: parsed.data.contactPerson || null,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        createdBy: auth.userId,
      })
      .returning();

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/suppliers error:", error);
    return Response.json({ error: "Failed to create supplier" }, { status: 500 });
  }
}
