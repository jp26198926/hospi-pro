import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { roleSchema } from "@/lib/validations/role";
import { eq, desc, asc, ilike, and, ne, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/roles", "Read");
    if (auth instanceof Response) return auth;
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const status = searchParams.get("status") || "all";

    const conditions = [];
    // Filter by status if specified; "all" shows every record including deleted
    if (status === "Active") {
      conditions.push(eq(roles.status, "Active"));
    } else if (status === "Deleted") {
      conditions.push(eq(roles.status, "Deleted"));
    }
    if (search) {
      conditions.push(ilike(roles.role, `%${search}%`));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "role"
        ? roles.role
        : sortBy === "updatedAt"
          ? roles.updatedAt
          : sortBy === "status"
            ? roles.status
            : roles.createdAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(roles)
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: drizzleCount() }).from(roles).where(where),
    ]);

    const total = countResult[0]?.value ?? 0;

    return Response.json({ data, total, page, limit });
  } catch (error) {
    console.error("GET /api/roles error:", error);
    return Response.json({ error: "Failed to fetch roles" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/roles", "Add");
    if (auth instanceof Response) return auth;
    const body = await request.json();
    const parsed = roleSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.role, parsed.data.role), ne(roles.status, "Deleted")));

    if (existing) {
      return Response.json({ error: "Role already exists" }, { status: 409 });
    }

    const [data] = await db.insert(roles).values(parsed.data).returning();

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/roles error:", error);
    return Response.json({ error: "Failed to create role" }, { status: 500 });
  }
}
