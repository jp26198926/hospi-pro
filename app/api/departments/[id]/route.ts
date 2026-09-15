import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { departmentSchema } from "@/lib/validations/department";
import { eq, ne, and } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/departments", "Read");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const departmentId = parseInt(id);

    if (isNaN(departmentId)) {
      return Response.json({ error: "Invalid department ID" }, { status: 400 });
    }

    const [data] = await db
      .select()
      .from(departments)
      .where(and(eq(departments.id, departmentId), ne(departments.status, "Deleted")));

    if (!data) {
      return Response.json({ error: "Department not found" }, { status: 404 });
    }

    return Response.json({ data });
  } catch (error) {
    console.error("GET /api/departments/[id] error:", error);
    return Response.json({ error: "Failed to fetch department" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/departments", "Edit");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const departmentId = parseInt(id);

    if (isNaN(departmentId)) {
      return Response.json({ error: "Invalid department ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = departmentSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(departments)
      .where(and(eq(departments.id, departmentId), ne(departments.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Department not found" }, { status: 404 });
    }

    const [conflict] = await db
      .select()
      .from(departments)
      .where(
        and(
          eq(departments.department, parsed.data.department),
          ne(departments.id, departmentId),
          ne(departments.status, "Deleted")
        )
      );

    if (conflict) {
      return Response.json({ error: "Department name already exists" }, { status: 409 });
    }

    const [data] = await db
      .update(departments)
      .set({ department: parsed.data.department, updatedAt: new Date() })
      .where(eq(departments.id, departmentId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PUT /api/departments/[id] error:", error);
    return Response.json({ error: "Failed to update department" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/departments", "Delete");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const departmentId = parseInt(id);

    if (isNaN(departmentId)) {
      return Response.json({ error: "Invalid department ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(departments)
      .where(and(eq(departments.id, departmentId), ne(departments.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Department not found" }, { status: 404 });
    }

    await db
      .update(departments)
      .set({ status: "Deleted", deletedAt: new Date() })
      .where(eq(departments.id, departmentId));

    return Response.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/departments/[id] error:", error);
    return Response.json({ error: "Failed to delete department" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/departments", "Restore");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const departmentId = parseInt(id);

    if (isNaN(departmentId)) {
      return Response.json({ error: "Invalid department ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(departments)
      .where(and(eq(departments.id, departmentId), eq(departments.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Deleted department not found" }, { status: 404 });
    }

    const [data] = await db
      .update(departments)
      .set({ status: "Active", deletedAt: null, updatedAt: new Date() })
      .where(eq(departments.id, departmentId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PATCH /api/departments/[id] error:", error);
    return Response.json({ error: "Failed to restore department" }, { status: 500 });
  }
}
