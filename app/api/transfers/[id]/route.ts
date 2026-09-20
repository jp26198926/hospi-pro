import { NextRequest } from "next/server";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { transfers, transferItems, locations, users } from "@/lib/db/schema";
import { transferSchema } from "@/lib/validations/transfer";
import { formatTransferNo } from "@/lib/validations/transfer-item";
import { formatUserDisplay } from "@/lib/format-user";
import { eq, and, inArray } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";
import { cancelCompletedTransfer } from "@/lib/transfer-stock";

const locFrom = alias(locations, "loc_from");
const locTo = alias(locations, "loc_to");

async function loadTransfer(id: number) {
  const [row] = await db
    .select({
      id: transfers.id,
      date: transfers.date,
      fromLocationId: transfers.fromLocationId,
      fromLocationName: locFrom.name,
      toLocationId: transfers.toLocationId,
      toLocationName: locTo.name,
      remarks: transfers.remarks,
      status: transfers.status,
      createdAt: transfers.createdAt,
      updatedAt: transfers.updatedAt,
      deletedAt: transfers.deletedAt,
      deletedReason: transfers.deletedReason,
      createdBy: transfers.createdBy,
      updatedBy: transfers.updatedBy,
      deletedBy: transfers.deletedBy,
    })
    .from(transfers)
    .innerJoin(locFrom, eq(transfers.fromLocationId, locFrom.id))
    .innerJoin(locTo, eq(transfers.toLocationId, locTo.id))
    .where(eq(transfers.id, id));

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
    userRows.map((u) => [u.id, formatUserDisplay(u.firstname, u.lastname)])
  );

  return {
    ...row,
    createdByEmail: null,
    createdByDisplay: row.createdBy ? userMap.get(row.createdBy) || "-" : "-",
    updatedByDisplay: row.updatedBy ? userMap.get(row.updatedBy) || "-" : "-",
    deletedByDisplay: row.deletedBy ? userMap.get(row.deletedBy) || "-" : "-",
    transNo: formatTransferNo(row.id),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/transfers", "Read");
    if (auth instanceof Response) return auth;
    const { id } = await params;
    const transferId = parseInt(id);
    if (isNaN(transferId)) {
      return Response.json({ error: "Invalid transfer ID" }, { status: 400 });
    }
    const data = await loadTransfer(transferId);
    if (!data) {
      return Response.json({ error: "Transfer not found" }, { status: 404 });
    }
    return Response.json({ data });
  } catch (error) {
    console.error("GET /api/transfers/[id] error:", error);
    return Response.json({ error: "Failed to fetch transfer" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/transfers", "Edit");
    if (auth instanceof Response) return auth;
    const { id } = await params;
    const transferId = parseInt(id);
    if (isNaN(transferId)) {
      return Response.json({ error: "Invalid transfer ID" }, { status: 400 });
    }

    const [existing] = await db.select().from(transfers).where(eq(transfers.id, transferId));
    if (!existing) {
      return Response.json({ error: "Transfer not found" }, { status: 404 });
    }
    if (existing.status !== "Draft") {
      return Response.json({ error: "Only draft transfers can be edited" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = transferSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    if (parsed.data.fromLocationId === parsed.data.toLocationId) {
      return Response.json(
        { error: "From and To locations must be different" },
        { status: 400 }
      );
    }

    const [data] = await db
      .update(transfers)
      .set({
        date: parsed.data.date,
        fromLocationId: parsed.data.fromLocationId,
        toLocationId: parsed.data.toLocationId,
        remarks: parsed.data.remarks || null,
        updatedAt: new Date(),
        updatedBy: auth.userId,
      })
      .where(eq(transfers.id, transferId))
      .returning();

    return Response.json({ data: { ...data, transNo: formatTransferNo(data.id) } });
  } catch (error) {
    console.error("PUT /api/transfers/[id] error:", error);
    return Response.json({ error: "Failed to update transfer" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/transfers", "Delete");
    if (auth instanceof Response) return auth;
    const { id } = await params;
    const transferId = parseInt(id);
    if (isNaN(transferId)) {
      return Response.json({ error: "Invalid transfer ID" }, { status: 400 });
    }

    const [existing] = await db.select().from(transfers).where(eq(transfers.id, transferId));
    if (!existing) {
      return Response.json({ error: "Transfer not found" }, { status: 404 });
    }
    if (existing.status === "Cancelled") {
      return Response.json({ error: "Transfer is already cancelled" }, { status: 400 });
    }

    let deletedReason: string | null = null;
    try {
      const body = await request.json();
      if (body?.reason) deletedReason = String(body.reason);
    } catch {
      // no body
    }

    if (existing.status === "Completed") {
      await cancelCompletedTransfer(transferId, auth.userId, deletedReason);
      return Response.json({ message: "Transfer cancelled and stock reversed" });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(transfers)
        .set({
          status: "Cancelled",
          deletedAt: new Date(),
          deletedBy: auth.userId,
          deletedReason,
        })
        .where(eq(transfers.id, transferId));
      await tx
        .update(transferItems)
        .set({
          status: "Cancelled",
          deletedAt: new Date(),
          deletedBy: auth.userId,
          deletedReason,
        })
        .where(
          and(eq(transferItems.transferId, transferId), eq(transferItems.status, "Draft"))
        );
    });

    return Response.json({ message: "Transfer cancelled successfully" });
  } catch (error) {
    console.error("DELETE /api/transfers/[id] error:", error);
    return Response.json({ error: "Failed to cancel transfer" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/transfers", "Restore");
    if (auth instanceof Response) return auth;
    const { id } = await params;
    const transferId = parseInt(id);
    if (isNaN(transferId)) {
      return Response.json({ error: "Invalid transfer ID" }, { status: 400 });
    }

    const [existing] = await db.select().from(transfers).where(eq(transfers.id, transferId));
    if (!existing) {
      return Response.json({ error: "Transfer not found" }, { status: 404 });
    }
    if (existing.status !== "Cancelled") {
      return Response.json(
        { error: "Only cancelled transfers can be restored" },
        { status: 400 }
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(transfers)
        .set({
          status: "Draft",
          deletedAt: null,
          deletedBy: null,
          deletedReason: null,
          updatedAt: new Date(),
          updatedBy: auth.userId,
        })
        .where(eq(transfers.id, transferId));
      await tx
        .update(transferItems)
        .set({
          status: "Draft",
          deletedAt: null,
          deletedBy: null,
          deletedReason: null,
          updatedAt: new Date(),
          updatedBy: auth.userId,
        })
        .where(eq(transferItems.transferId, transferId));
    });

    return Response.json({ message: "Transfer restored to draft" });
  } catch (error) {
    console.error("PATCH /api/transfers/[id] error:", error);
    return Response.json({ error: "Failed to restore transfer" }, { status: 500 });
  }
}
