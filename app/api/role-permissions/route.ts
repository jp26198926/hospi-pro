import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { rolePermissions, pages, permissions } from "@/lib/db/schema";
import { rolePermissionSchema } from "@/lib/validations/role-permission";
import { eq, desc, asc, and, ilike, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";
import { invalidatePermissionCache } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/roles", "Read");
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const roleId = searchParams.get("roleId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const searchPage = searchParams.get("searchPage") || "";
    const searchPermission = searchParams.get("searchPermission") || "";

    if (!roleId) {
      return Response.json({ error: "roleId is required" }, { status: 400 });
    }

    const conditions = [eq(rolePermissions.roleId, parseInt(roleId))];

    if (searchPage) {
      conditions.push(ilike(pages.page, `%${searchPage}%`));
    }
    if (searchPermission) {
      conditions.push(ilike(permissions.permission, `%${searchPermission}%`));
    }

    const where = and(...conditions);

    const sortColumn =
      sortBy === "page"
        ? pages.page
        : sortBy === "permission"
          ? permissions.permission
          : rolePermissions.createdAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: rolePermissions.id,
          roleId: rolePermissions.roleId,
          pageId: rolePermissions.pageId,
          pageName: pages.page,
          permissionId: rolePermissions.permissionId,
          permissionName: permissions.permission,
          createdAt: rolePermissions.createdAt,
        })
        .from(rolePermissions)
        .innerJoin(pages, eq(rolePermissions.pageId, pages.id))
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: drizzleCount() }).from(rolePermissions)
        .innerJoin(pages, eq(rolePermissions.pageId, pages.id))
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(where),
    ]);

    const total = countResult[0]?.value ?? 0;

    return Response.json({ data, total, page, limit });
  } catch (error) {
    console.error("GET /api/role-permissions error:", error);
    return Response.json({ error: "Failed to fetch role permissions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/roles", "Edit");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = rolePermissionSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Check for duplicate composite key
    const [existing] = await db
      .select()
      .from(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, parsed.data.roleId),
          eq(rolePermissions.pageId, parsed.data.pageId),
          eq(rolePermissions.permissionId, parsed.data.permissionId)
        )
      );

    if (existing) {
      return Response.json({ error: "This role permission already exists" }, { status: 409 });
    }

    const [data] = await db.insert(rolePermissions).values(parsed.data).returning();

    invalidatePermissionCache(parsed.data.roleId);

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/role-permissions error:", error);
    return Response.json({ error: "Failed to create role permission" }, { status: 500 });
  }
}
