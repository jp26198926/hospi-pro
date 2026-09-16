import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { uoms } from "@/lib/db/schema";
import { uomSchema } from "@/lib/validations/uom";
import { eq, desc, asc, ilike, and, ne, or, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/uoms", "Read");
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
      conditions.push(eq(uoms.status, "Active"));
    } else if (status === "Deleted") {
      conditions.push(eq(uoms.status, "Deleted"));
    }
    if (search) {
      conditions.push(or(ilike(uoms.code, `%${search}%`), ilike(uoms.name, `%${search}%`)));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "code"
        ? uoms.code
        : sortBy === "name"
          ? uoms.name
          : sortBy === "updatedAt"
            ? uoms.updatedAt
            : sortBy === "status"
              ? uoms.status
              : uoms.createdAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(uoms)
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: drizzleCount() }).from(uoms).where(where),
    ]);

    const total = countResult[0]?.value ?? 0;

    return Response.json({ data, total, page, limit });
  } catch (error) {
    console.error("GET /api/uoms error:", error);
    return Response.json({ error: "Failed to fetch UOMs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/uoms", "Add");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = uomSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existingCode] = await db
      .select()
      .from(uoms)
      .where(and(eq(uoms.code, parsed.data.code), ne(uoms.status, "Deleted")));

    if (existingCode) {
      return Response.json({ error: "UOM code already exists" }, { status: 409 });
    }

    const [existingName] = await db
      .select()
      .from(uoms)
      .where(and(eq(uoms.name, parsed.data.name), ne(uoms.status, "Deleted")));

    if (existingName) {
      return Response.json({ error: "UOM name already exists" }, { status: 409 });
    }

    const [data] = await db.insert(uoms).values(parsed.data).returning();

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/uoms error:", error);
    return Response.json({ error: "Failed to create UOM" }, { status: 500 });
  }
}
