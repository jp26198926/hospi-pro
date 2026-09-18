import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { receivings, receivingItems, suppliers, locations, users } from "@/lib/db/schema";
import { receivingSchema } from "@/lib/validations/receiving";
import { formatReceivingNo } from "@/lib/validations/receiving-item";
import { formatUserDisplay } from "@/lib/receivings";
import { eq, and, inArray } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";
import { cancelCompletedReceiving } from "@/lib/receiving-stock";

async function loadReceiving(id: number) {
  const [row] = await db
    .select({
      id: receivings.id,
      date: receivings.date,
      supplierId: receivings.supplierId,
      supplierName: suppliers.name,
      locationId: receivings.locationId,
      locationName: locations.name,
      poNumber: receivings.poNumber,
      invoiceNumber: receivings.invoiceNumber,
      remarks: receivings.remarks,
      status: receivings.status,
      createdAt: receivings.createdAt,
      updatedAt: receivings.updatedAt,
      deletedAt: receivings.deletedAt,
      deletedReason: receivings.deletedReason,
      createdBy: receivings.createdBy,
      updatedBy: receivings.updatedBy,
      deletedBy: receivings.deletedBy,
    })
    .from(receivings)
    .innerJoin(suppliers, eq(receivings.supplierId, suppliers.id))
    .innerJoin(locations, eq(receivings.locationId, locations.id))
    .where(eq(receivings.id, id));

  if (!row) return null;

  const userIds = [row.createdBy, row.updatedBy, row.deletedBy].filter(
    (v): v is number => typeof v === "number"
  );
  const userRows = userIds.length
    ? await db
        .select({ id: users.id, firstname: users.firstname, lastname: users.lastname })
        .from(users)
        .where(inArray(users.id, userIds))
    : [];
  const userMap = new Map(
    userRows.map((u) => [
      u.id,
      formatUserDisplay(u.firstname, u.lastname),
    ])
  );

  return {
    ...row,
    createdByEmail: null,
    createdByDisplay: row.createdBy ? userMap.get(row.createdBy) || "-" : "-",
    updatedByDisplay: row.updatedBy ? userMap.get(row.updatedBy) || "-" : "-",
    deletedByDisplay: row.deletedBy ? userMap.get(row.deletedBy) || "-" : "-",
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/receivings", "Read");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const receivingId = parseInt(id);
    if (isNaN(receivingId)) {
      return Response.json({ error: "Invalid receiving ID" }, { status: 400 });
    }

    const data = await loadReceiving(receivingId);
    if (!data) {
      return Response.json({ error: "Receiving not found" }, { status: 404 });
    }

    return Response.json({
      data: { ...data, transNo: formatReceivingNo(data.id) },
    });
  } catch (error) {
    console.error("GET /api/receivings/[id] error:", error);
    return Response.json({ error: "Failed to fetch receiving" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/receivings", "Edit");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const receivingId = parseInt(id);
    if (isNaN(receivingId)) {
      return Response.json({ error: "Invalid receiving ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(receivings)
      .where(eq(receivings.id, receivingId));

    if (!existing) {
      return Response.json({ error: "Receiving not found" }, { status: 404 });
    }
    if (existing.status !== "Draft") {
      return Response.json({ error: "Only draft receivings can be edited" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = receivingSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [data] = await db
      .update(receivings)
      .set({
        date: parsed.data.date,
        supplierId: parsed.data.supplierId,
        locationId: parsed.data.locationId,
        poNumber: parsed.data.poNumber || null,
        invoiceNumber: parsed.data.invoiceNumber || null,
        remarks: parsed.data.remarks || null,
        updatedAt: new Date(),
        updatedBy: auth.userId,
      })
      .where(eq(receivings.id, receivingId))
      .returning();

    return Response.json({
      data: { ...data, transNo: formatReceivingNo(data.id) },
    });
  } catch (error) {
    console.error("PUT /api/receivings/[id] error:", error);
    return Response.json({ error: "Failed to update receiving" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/receivings", "Delete");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const receivingId = parseInt(id);
    if (isNaN(receivingId)) {
      return Response.json({ error: "Invalid receiving ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(receivings)
      .where(eq(receivings.id, receivingId));

    if (!existing) {
      return Response.json({ error: "Receiving not found" }, { status: 404 });
    }
    if (existing.status === "Cancelled") {
      return Response.json({ error: "Receiving is already cancelled" }, { status: 400 });
    }

    let deletedReason: string | null = null;
    try {
      const body = await request.json();
      if (body?.reason) deletedReason = String(body.reason);
    } catch {
      // no body
    }

    if (existing.status === "Completed") {
      await cancelCompletedReceiving(receivingId, auth.userId, deletedReason);
      return Response.json({ message: "Receiving cancelled and stock reversed" });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(receivings)
        .set({
          status: "Cancelled",
          deletedAt: new Date(),
          deletedBy: auth.userId,
          deletedReason,
        })
        .where(eq(receivings.id, receivingId));

      await tx
        .update(receivingItems)
        .set({
          status: "Cancelled",
          deletedAt: new Date(),
          deletedBy: auth.userId,
          deletedReason,
        })
        .where(
          and(
            eq(receivingItems.receivingId, receivingId),
            eq(receivingItems.status, "Draft")
          )
        );
    });

    return Response.json({ message: "Receiving cancelled successfully" });
  } catch (error) {
    console.error("DELETE /api/receivings/[id] error:", error);
    return Response.json({ error: "Failed to cancel receiving" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/receivings", "Restore");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const receivingId = parseInt(id);
    if (isNaN(receivingId)) {
      return Response.json({ error: "Invalid receiving ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(receivings)
      .where(eq(receivings.id, receivingId));

    if (!existing) {
      return Response.json({ error: "Receiving not found" }, { status: 404 });
    }
    if (existing.status !== "Cancelled") {
      return Response.json(
        { error: "Only cancelled receivings can be restored" },
        { status: 400 }
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(receivings)
        .set({
          status: "Draft",
          deletedAt: null,
          deletedBy: null,
          deletedReason: null,
          updatedAt: new Date(),
          updatedBy: auth.userId,
        })
        .where(eq(receivings.id, receivingId));

      await tx
        .update(receivingItems)
        .set({
          status: "Draft",
          deletedAt: null,
          deletedBy: null,
          deletedReason: null,
          updatedAt: new Date(),
          updatedBy: auth.userId,
        })
        .where(eq(receivingItems.receivingId, receivingId));
    });

    return Response.json({ message: "Receiving restored to draft" });
  } catch (error) {
    console.error("PATCH /api/receivings/[id] error:", error);
    return Response.json({ error: "Failed to restore receiving" }, { status: 500 });
  }
}
