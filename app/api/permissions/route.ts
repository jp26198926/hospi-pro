import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { permissions } from "@/lib/db/schema";
import { permissionSchema } from "@/lib/validations/permission";
import { eq, desc, asc, ilike, and, ne, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/permissions", "Read");
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
      conditions.push(eq(permissions.status, "Active"));
    } else if (status === "Deleted") {
      conditions.push(eq(permissions.status, "Deleted"));
    }
    if (search) {
      conditions.push(ilike(permissions.permission, `%${search}%`));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "permission"
        ? permissions.permission
        : sortBy === "updatedAt"
          ? permissions.updatedAt
          : sortBy === "status"
            ? permissions.status
            : permissions.createdAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(permissions)
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: drizzleCount() }).from(permissions).where(where),
    ]);

    const total = countResult[0]?.value ?? 0;

    return Response.json({ data, total, page, limit });
  } catch (error) {
    console.error("GET /api/permissions error:", error);
    return Response.json({ error: "Failed to fetch permissions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/permissions", "Add");
    if (auth instanceof Response) return auth;
    const body = await request.json();
    const parsed = permissionSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(permissions)
      .where(and(eq(permissions.permission, parsed.data.permission), ne(permissions.status, "Deleted")));

    if (existing) {
      return Response.json({ error: "Permission already exists" }, { status: 409 });
    }

    const [data] = await db.insert(permissions).values(parsed.data).returning();

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/permissions error:", error);
    return Response.json({ error: "Failed to create permission" }, { status: 500 });
  }
}
