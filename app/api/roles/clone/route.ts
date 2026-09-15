import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { roles, rolePermissions } from "@/lib/db/schema";
import { eq, ne, and } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";
import { invalidatePermissionCache } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/roles", "Clone");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { sourceRoleId, newRoleName } = body;

    if (!sourceRoleId || !newRoleName) {
      return Response.json({ error: "sourceRoleId and newRoleName are required" }, { status: 400 });
    }

    // Check if source role exists
    const [sourceRole] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, sourceRoleId), ne(roles.status, "Deleted")));

    if (!sourceRole) {
      return Response.json({ error: "Source role not found" }, { status: 404 });
    }

    // Check if new role name already exists
    const [existing] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.role, newRoleName), ne(roles.status, "Deleted")));

    if (existing) {
      return Response.json({ error: "Role name already exists" }, { status: 409 });
    }

    // Create new role
    const [newRole] = await db
      .insert(roles)
      .values({ role: newRoleName })
      .returning();

    // Fetch all role_permissions from source role
    const sourcePermissions = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, sourceRoleId));

    // Copy permissions to new role
    if (sourcePermissions.length > 0) {
      const newPermissions = sourcePermissions.map((rp) => ({
        roleId: newRole.id,
        pageId: rp.pageId,
        permissionId: rp.permissionId,
      }));

      await db.insert(rolePermissions).values(newPermissions);
    }

    invalidatePermissionCache(newRole.id);

    return Response.json({
      data: newRole,
      message: `Role cloned with ${sourcePermissions.length} permission(s)`,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/roles/clone error:", error);
    return Response.json({ error: "Failed to clone role" }, { status: 500 });
  }
}
