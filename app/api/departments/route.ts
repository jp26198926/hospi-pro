import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { departmentSchema } from "@/lib/validations/department";
import { eq, desc, asc, ilike, and, ne, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/departments", "Read");
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
      conditions.push(eq(departments.status, "Active"));
    } else if (status === "Deleted") {
      conditions.push(eq(departments.status, "Deleted"));
    }
    if (search) {
      conditions.push(ilike(departments.department, `%${search}%`));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "department"
        ? departments.department
        : sortBy === "updatedAt"
          ? departments.updatedAt
          : sortBy === "status"
            ? departments.status
            : departments.createdAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(departments)
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: drizzleCount() }).from(departments).where(where),
    ]);

    const total = countResult[0]?.value ?? 0;

    return Response.json({ data, total, page, limit });
  } catch (error) {
    console.error("GET /api/departments error:", error);
    return Response.json({ error: "Failed to fetch departments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/departments", "Add");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = departmentSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(departments)
      .where(and(eq(departments.department, parsed.data.department), ne(departments.status, "Deleted")));

    if (existing) {
      return Response.json({ error: "Department already exists" }, { status: 409 });
    }

    const [data] = await db.insert(departments).values(parsed.data).returning();

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/departments error:", error);
    return Response.json({ error: "Failed to create department" }, { status: 500 });
  }
}
