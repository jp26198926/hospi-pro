import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, departments, roles } from "@/lib/db/schema";
import { userCreateSchema } from "@/lib/validations/user";
import { eq, desc, asc, ilike, and, ne, count as drizzleCount } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/users", "Read");
    if (auth instanceof Response) return auth;
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const status = searchParams.get("status") || "all";
    const departmentId = searchParams.get("departmentId") || "all";
    const roleId = searchParams.get("roleId") || "all";

    const conditions = [];
    if (status === "Active") {
      conditions.push(eq(users.status, "Active"));
    } else if (status === "Deleted") {
      conditions.push(eq(users.status, "Deleted"));
    }
    if (search) {
      conditions.push(
        ilike(users.email, `%${search}%`)
      );
    }
    if (departmentId !== "all") {
      conditions.push(eq(users.departmentId, parseInt(departmentId)));
    }
    if (roleId !== "all") {
      conditions.push(eq(users.roleId, parseInt(roleId)));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "email"
        ? users.email
        : sortBy === "firstname"
          ? users.firstname
          : sortBy === "updatedAt"
            ? users.updatedAt
            : sortBy === "status"
              ? users.status
              : users.createdAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          firstname: users.firstname,
          lastname: users.lastname,
          departmentId: users.departmentId,
          departmentName: departments.department,
          roleId: users.roleId,
          roleName: roles.role,
          status: users.status,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          deletedAt: users.deletedAt,
        })
        .from(users)
        .leftJoin(departments, eq(users.departmentId, departments.id))
        .leftJoin(roles, eq(users.roleId, roles.id))
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: drizzleCount() }).from(users).where(where),
    ]);

    const total = countResult[0]?.value ?? 0;

    return Response.json({ data, total, page, limit });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return Response.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/users", "Add");
    if (auth instanceof Response) return auth;
    const body = await request.json();
    const parsed = userCreateSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, parsed.data.email), ne(users.status, "Deleted")));

    if (existing) {
      return Response.json({ error: "Email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

    const [data] = await db.insert(users).values({
      ...parsed.data,
      password: hashedPassword,
      departmentId: parsed.data.departmentId || null,
      roleId: parsed.data.roleId || null,
    }).returning();

    // Return without password
    const { password: _, ...userWithoutPassword } = data;

    return Response.json({ data: userWithoutPassword }, { status: 201 });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return Response.json({ error: "Failed to create user" }, { status: 500 });
  }
}
