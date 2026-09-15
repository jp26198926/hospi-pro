import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { roleSchema } from "@/lib/validations/role";
import { eq, ne, and } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/roles", "Read");
    if (auth instanceof Response) return auth;
    const { id } = await params;
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      return Response.json({ error: "Invalid role ID" }, { status: 400 });
    }

    const [data] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), ne(roles.status, "Deleted")));

    if (!data) {
      return Response.json({ error: "Role not found" }, { status: 404 });
    }

    return Response.json({ data });
  } catch (error) {
    console.error("GET /api/roles/[id] error:", error);
    return Response.json({ error: "Failed to fetch role" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/roles", "Edit");
    if (auth instanceof Response) return auth;
    const { id } = await params;
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      return Response.json({ error: "Invalid role ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = roleSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), ne(roles.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Role not found" }, { status: 404 });
    }

    const [conflict] = await db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.role, parsed.data.role),
          ne(roles.id, roleId),
          ne(roles.status, "Deleted")
        )
      );

    if (conflict) {
      return Response.json({ error: "Role name already exists" }, { status: 409 });
    }

    const [data] = await db
      .update(roles)
      .set({ role: parsed.data.role, updatedAt: new Date() })
      .where(eq(roles.id, roleId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PUT /api/roles/[id] error:", error);
    return Response.json({ error: "Failed to update role" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/roles", "Delete");
    if (auth instanceof Response) return auth;
    const { id } = await params;
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      return Response.json({ error: "Invalid role ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), ne(roles.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Role not found" }, { status: 404 });
    }

    // Soft delete: set status to "Deleted" and deletedAt to now
    await db
      .update(roles)
      .set({ status: "Deleted", deletedAt: new Date() })
      .where(eq(roles.id, roleId));

    return Response.json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/roles/[id] error:", error);
    return Response.json({ error: "Failed to delete role" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/roles", "Restore");
    if (auth instanceof Response) return auth;
    const { id } = await params;
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      return Response.json({ error: "Invalid role ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Deleted role not found" }, { status: 404 });
    }

    const [data] = await db
      .update(roles)
      .set({ status: "Active", deletedAt: null, updatedAt: new Date() })
      .where(eq(roles.id, roleId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PATCH /api/roles/[id] error:", error);
    return Response.json({ error: "Failed to restore role" }, { status: 500 });
  }
}
