import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { permissions } from "@/lib/db/schema";
import { permissionSchema } from "@/lib/validations/permission";
import { eq, ne, and } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/permissions", "Read");
    if (auth instanceof Response) return auth;
    const { id } = await params;
    const permissionId = parseInt(id);

    if (isNaN(permissionId)) {
      return Response.json({ error: "Invalid permission ID" }, { status: 400 });
    }

    const [data] = await db
      .select()
      .from(permissions)
      .where(and(eq(permissions.id, permissionId), ne(permissions.status, "Deleted")));

    if (!data) {
      return Response.json({ error: "Permission not found" }, { status: 404 });
    }

    return Response.json({ data });
  } catch (error) {
    console.error("GET /api/permissions/[id] error:", error);
    return Response.json({ error: "Failed to fetch permission" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/permissions", "Edit");
    if (auth instanceof Response) return auth;
    const { id } = await params;
    const permissionId = parseInt(id);

    if (isNaN(permissionId)) {
      return Response.json({ error: "Invalid permission ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = permissionSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(permissions)
      .where(and(eq(permissions.id, permissionId), ne(permissions.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Permission not found" }, { status: 404 });
    }

    const [conflict] = await db
      .select()
      .from(permissions)
      .where(
        and(
          eq(permissions.permission, parsed.data.permission),
          ne(permissions.id, permissionId),
          ne(permissions.status, "Deleted")
        )
      );

    if (conflict) {
      return Response.json({ error: "Permission name already exists" }, { status: 409 });
    }

    const [data] = await db
      .update(permissions)
      .set({ permission: parsed.data.permission, updatedAt: new Date() })
      .where(eq(permissions.id, permissionId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PUT /api/permissions/[id] error:", error);
    return Response.json({ error: "Failed to update permission" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/permissions", "Delete");
    if (auth instanceof Response) return auth;
    const { id } = await params;
    const permissionId = parseInt(id);

    if (isNaN(permissionId)) {
      return Response.json({ error: "Invalid permission ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(permissions)
      .where(and(eq(permissions.id, permissionId), ne(permissions.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Permission not found" }, { status: 404 });
    }

    await db
      .update(permissions)
      .set({ status: "Deleted", deletedAt: new Date() })
      .where(eq(permissions.id, permissionId));

    return Response.json({ message: "Permission deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/permissions/[id] error:", error);
    return Response.json({ error: "Failed to delete permission" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/permissions", "Restore");
    if (auth instanceof Response) return auth;
    const { id } = await params;
    const permissionId = parseInt(id);

    if (isNaN(permissionId)) {
      return Response.json({ error: "Invalid permission ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(permissions)
      .where(and(eq(permissions.id, permissionId), eq(permissions.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Deleted permission not found" }, { status: 404 });
    }

    const [data] = await db
      .update(permissions)
      .set({ status: "Active", deletedAt: null, updatedAt: new Date() })
      .where(eq(permissions.id, permissionId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PATCH /api/permissions/[id] error:", error);
    return Response.json({ error: "Failed to restore permission" }, { status: 500 });
  }
}
