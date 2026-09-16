import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { uoms } from "@/lib/db/schema";
import { uomSchema } from "@/lib/validations/uom";
import { eq, ne, and } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/uoms", "Read");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const uomId = parseInt(id);

    if (isNaN(uomId)) {
      return Response.json({ error: "Invalid UOM ID" }, { status: 400 });
    }

    const [data] = await db
      .select()
      .from(uoms)
      .where(and(eq(uoms.id, uomId), ne(uoms.status, "Deleted")));

    if (!data) {
      return Response.json({ error: "UOM not found" }, { status: 404 });
    }

    return Response.json({ data });
  } catch (error) {
    console.error("GET /api/uoms/[id] error:", error);
    return Response.json({ error: "Failed to fetch UOM" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/uoms", "Edit");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const uomId = parseInt(id);

    if (isNaN(uomId)) {
      return Response.json({ error: "Invalid UOM ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = uomSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(uoms)
      .where(and(eq(uoms.id, uomId), ne(uoms.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "UOM not found" }, { status: 404 });
    }

    const [conflictCode] = await db
      .select()
      .from(uoms)
      .where(and(eq(uoms.code, parsed.data.code), ne(uoms.id, uomId), ne(uoms.status, "Deleted")));

    if (conflictCode) {
      return Response.json({ error: "UOM code already exists" }, { status: 409 });
    }

    const [conflictName] = await db
      .select()
      .from(uoms)
      .where(and(eq(uoms.name, parsed.data.name), ne(uoms.id, uomId), ne(uoms.status, "Deleted")));

    if (conflictName) {
      return Response.json({ error: "UOM name already exists" }, { status: 409 });
    }

    const [data] = await db
      .update(uoms)
      .set({ code: parsed.data.code, name: parsed.data.name, updatedAt: new Date() })
      .where(eq(uoms.id, uomId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PUT /api/uoms/[id] error:", error);
    return Response.json({ error: "Failed to update UOM" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/uoms", "Delete");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const uomId = parseInt(id);

    if (isNaN(uomId)) {
      return Response.json({ error: "Invalid UOM ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(uoms)
      .where(and(eq(uoms.id, uomId), ne(uoms.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "UOM not found" }, { status: 404 });
    }

    await db
      .update(uoms)
      .set({ status: "Deleted", deletedAt: new Date() })
      .where(eq(uoms.id, uomId));

    return Response.json({ message: "UOM deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/uoms/[id] error:", error);
    return Response.json({ error: "Failed to delete UOM" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/uoms", "Restore");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const uomId = parseInt(id);

    if (isNaN(uomId)) {
      return Response.json({ error: "Invalid UOM ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(uoms)
      .where(and(eq(uoms.id, uomId), eq(uoms.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Deleted UOM not found" }, { status: 404 });
    }

    const [data] = await db
      .update(uoms)
      .set({ status: "Active", deletedAt: null, updatedAt: new Date() })
      .where(eq(uoms.id, uomId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PATCH /api/uoms/[id] error:", error);
    return Response.json({ error: "Failed to restore UOM" }, { status: 500 });
  }
}
