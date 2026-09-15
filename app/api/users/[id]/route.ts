import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, departments, roles } from "@/lib/db/schema";
import { userUpdateSchema } from "@/lib/validations/user";
import { eq, ne, and } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/users", "Read");
    if (auth instanceof Response) return auth;
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return Response.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const [data] = await db
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
      .where(and(eq(users.id, userId), ne(users.status, "Deleted")));

    if (!data) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ data });
  } catch (error) {
    console.error("GET /api/users/[id] error:", error);
    return Response.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/users", "Edit");
    if (auth instanceof Response) return auth;
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return Response.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = userUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), ne(users.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const [conflict] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, parsed.data.email),
          ne(users.id, userId),
          ne(users.status, "Deleted")
        )
      );

    if (conflict) {
      return Response.json({ error: "Email already exists" }, { status: 409 });
    }

    const [data] = await db
      .update(users)
      .set({
        email: parsed.data.email,
        firstname: parsed.data.firstname,
        lastname: parsed.data.lastname,
        departmentId: parsed.data.departmentId || null,
        roleId: parsed.data.roleId || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    const { password: _, ...userWithoutPassword } = data;

    return Response.json({ data: userWithoutPassword });
  } catch (error) {
    console.error("PUT /api/users/[id] error:", error);
    return Response.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/users", "Delete");
    if (auth instanceof Response) return auth;
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return Response.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), ne(users.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    await db
      .update(users)
      .set({ status: "Deleted", deletedAt: new Date() })
      .where(eq(users.id, userId));

    return Response.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/users/[id] error:", error);
    return Response.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/users", "Restore");
    if (auth instanceof Response) return auth;
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return Response.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Deleted user not found" }, { status: 404 });
    }

    const [data] = await db
      .update(users)
      .set({ status: "Active", deletedAt: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    const { password: _, ...userWithoutPassword } = data;

    return Response.json({ data: userWithoutPassword });
  } catch (error) {
    console.error("PATCH /api/users/[id] error:", error);
    return Response.json({ error: "Failed to restore user" }, { status: 500 });
  }
}
