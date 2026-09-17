import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";
import { supplierSchema } from "@/lib/validations/supplier";
import { eq, ne, and } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/suppliers", "Read");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const supplierId = parseInt(id);

    if (isNaN(supplierId)) {
      return Response.json({ error: "Invalid supplier ID" }, { status: 400 });
    }

    const [data] = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, supplierId), ne(suppliers.status, "Deleted")));

    if (!data) {
      return Response.json({ error: "Supplier not found" }, { status: 404 });
    }

    return Response.json({ data });
  } catch (error) {
    console.error("GET /api/suppliers/[id] error:", error);
    return Response.json({ error: "Failed to fetch supplier" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/suppliers", "Edit");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const supplierId = parseInt(id);

    if (isNaN(supplierId)) {
      return Response.json({ error: "Invalid supplier ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = supplierSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, supplierId), ne(suppliers.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Supplier not found" }, { status: 404 });
    }

    const [conflict] = await db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.name, parsed.data.name),
          ne(suppliers.id, supplierId),
          ne(suppliers.status, "Deleted")
        )
      );

    if (conflict) {
      return Response.json({ error: "Supplier name already exists" }, { status: 409 });
    }

    const [data] = await db
      .update(suppliers)
      .set({
        name: parsed.data.name,
        contactPerson: parsed.data.contactPerson || null,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        updatedAt: new Date(),
        updatedBy: auth.userId,
      })
      .where(eq(suppliers.id, supplierId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PUT /api/suppliers/[id] error:", error);
    return Response.json({ error: "Failed to update supplier" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/suppliers", "Delete");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const supplierId = parseInt(id);

    if (isNaN(supplierId)) {
      return Response.json({ error: "Invalid supplier ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, supplierId), ne(suppliers.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Supplier not found" }, { status: 404 });
    }

    // Optional reason from request body
    let deletedReason: string | null = null;
    try {
      const body = await request.json();
      if (body?.reason) deletedReason = String(body.reason);
    } catch {
      // No body provided — that's fine
    }

    await db
      .update(suppliers)
      .set({
        status: "Deleted",
        deletedAt: new Date(),
        deletedBy: auth.userId,
        deletedReason,
      })
      .where(eq(suppliers.id, supplierId));

    return Response.json({ message: "Supplier deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/suppliers/[id] error:", error);
    return Response.json({ error: "Failed to delete supplier" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/suppliers", "Restore");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const supplierId = parseInt(id);

    if (isNaN(supplierId)) {
      return Response.json({ error: "Invalid supplier ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Deleted supplier not found" }, { status: 404 });
    }

    const [data] = await db
      .update(suppliers)
      .set({
        status: "Active",
        deletedAt: null,
        deletedBy: null,
        deletedReason: null,
        updatedAt: new Date(),
        updatedBy: auth.userId,
      })
      .where(eq(suppliers.id, supplierId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PATCH /api/suppliers/[id] error:", error);
    return Response.json({ error: "Failed to restore supplier" }, { status: 500 });
  }
}
