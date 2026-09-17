import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { gstTypes } from "@/lib/db/schema";
import { gstTypeSchema } from "@/lib/validations/gst-type";
import { eq, ne, and } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/gst-types", "Read");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const gstTypeId = parseInt(id);

    if (isNaN(gstTypeId)) {
      return Response.json({ error: "Invalid GST type ID" }, { status: 400 });
    }

    const [data] = await db
      .select()
      .from(gstTypes)
      .where(and(eq(gstTypes.id, gstTypeId), ne(gstTypes.status, "Deleted")));

    if (!data) {
      return Response.json({ error: "GST type not found" }, { status: 404 });
    }

    return Response.json({ data });
  } catch (error) {
    console.error("GET /api/gst-types/[id] error:", error);
    return Response.json({ error: "Failed to fetch GST type" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/gst-types", "Edit");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const gstTypeId = parseInt(id);

    if (isNaN(gstTypeId)) {
      return Response.json({ error: "Invalid GST type ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = gstTypeSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(gstTypes)
      .where(and(eq(gstTypes.id, gstTypeId), ne(gstTypes.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "GST type not found" }, { status: 404 });
    }

    const [conflictCode] = await db
      .select()
      .from(gstTypes)
      .where(and(eq(gstTypes.code, parsed.data.code), ne(gstTypes.id, gstTypeId), ne(gstTypes.status, "Deleted")));

    if (conflictCode) {
      return Response.json({ error: "GST type code already exists" }, { status: 409 });
    }

    const [conflictName] = await db
      .select()
      .from(gstTypes)
      .where(and(eq(gstTypes.name, parsed.data.name), ne(gstTypes.id, gstTypeId), ne(gstTypes.status, "Deleted")));

    if (conflictName) {
      return Response.json({ error: "GST type name already exists" }, { status: 409 });
    }

    const [data] = await db
      .update(gstTypes)
      .set({ code: parsed.data.code, name: parsed.data.name, updatedAt: new Date(), updatedBy: auth.userId })
      .where(eq(gstTypes.id, gstTypeId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PUT /api/gst-types/[id] error:", error);
    return Response.json({ error: "Failed to update GST type" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/gst-types", "Delete");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const gstTypeId = parseInt(id);

    if (isNaN(gstTypeId)) {
      return Response.json({ error: "Invalid GST type ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(gstTypes)
      .where(and(eq(gstTypes.id, gstTypeId), ne(gstTypes.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "GST type not found" }, { status: 404 });
    }

    let deletedReason: string | null = null;
    try {
      const body = await request.json();
      if (body?.reason) deletedReason = String(body.reason);
    } catch {
      // No body — fine
    }

    await db
      .update(gstTypes)
      .set({ status: "Deleted", deletedAt: new Date(), deletedBy: auth.userId, deletedReason })
      .where(eq(gstTypes.id, gstTypeId));

    return Response.json({ message: "GST type deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/gst-types/[id] error:", error);
    return Response.json({ error: "Failed to delete GST type" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/gst-types", "Restore");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const gstTypeId = parseInt(id);

    if (isNaN(gstTypeId)) {
      return Response.json({ error: "Invalid GST type ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(gstTypes)
      .where(and(eq(gstTypes.id, gstTypeId), eq(gstTypes.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Deleted GST type not found" }, { status: 404 });
    }

    const [data] = await db
      .update(gstTypes)
      .set({
        status: "Active",
        deletedAt: null,
        deletedBy: null,
        deletedReason: null,
        updatedAt: new Date(),
        updatedBy: auth.userId,
      })
      .where(eq(gstTypes.id, gstTypeId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PATCH /api/gst-types/[id] error:", error);
    return Response.json({ error: "Failed to restore GST type" }, { status: 500 });
  }
}
