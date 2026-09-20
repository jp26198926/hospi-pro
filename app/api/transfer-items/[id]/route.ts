import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { transferItems, transfers } from "@/lib/db/schema";
import { transferItemSchema, formatTransferItemNo } from "@/lib/validations/transfer-item";
import { getDraftItemsQty, getStockAtLocation } from "@/lib/transfer-stock";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

async function loadItem(id: number) {
  const [row] = await db.select().from(transferItems).where(eq(transferItems.id, id));
  return row;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/transfers", "Edit");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return Response.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const item = await loadItem(itemId);
    if (!item) {
      return Response.json({ error: "Transfer item not found" }, { status: 404 });
    }

    const [parent] = await db.select().from(transfers).where(eq(transfers.id, item.transferId));
    if (!parent || parent.status !== "Draft" || item.status !== "Draft") {
      return Response.json(
        { error: "Only draft items on draft transfers can be edited" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = transferItemSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const available = await getStockAtLocation(parsed.data.productId, parent.fromLocationId);
    const draftQty = await getDraftItemsQty(
      item.transferId,
      parsed.data.productId,
      itemId
    );
    if (parsed.data.qty + draftQty > available) {
      return Response.json(
        { error: `Insufficient stock at from-location. Available: ${available.toFixed(4)}` },
        { status: 400 }
      );
    }

    const [data] = await db
      .update(transferItems)
      .set({
        productId: parsed.data.productId,
        qty: parsed.data.qty.toFixed(4),
        dateExpiry: parsed.data.dateExpiry || null,
        remarks: parsed.data.remarks || null,
        updatedAt: new Date(),
        updatedBy: auth.userId,
      })
      .where(eq(transferItems.id, itemId))
      .returning();

    return Response.json({ data: { ...data, seriesNo: formatTransferItemNo(data.id) } });
  } catch (error) {
    console.error("PUT /api/transfer-items/[id] error:", error);
    return Response.json({ error: "Failed to update transfer item" }, { status: 500 });
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
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return Response.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const item = await loadItem(itemId);
    if (!item) {
      return Response.json({ error: "Transfer item not found" }, { status: 404 });
    }
    if (item.status !== "Draft") {
      return Response.json({ error: "Only draft items can be cancelled" }, { status: 400 });
    }

    const [parent] = await db.select().from(transfers).where(eq(transfers.id, item.transferId));
    if (!parent || parent.status !== "Draft") {
      return Response.json(
        { error: "Items can only be cancelled on draft transfers" },
        { status: 400 }
      );
    }

    let deletedReason: string | null = null;
    try {
      const body = await request.json();
      if (body?.reason) deletedReason = String(body.reason);
    } catch {
      // no body
    }

    await db
      .update(transferItems)
      .set({
        status: "Cancelled",
        deletedAt: new Date(),
        deletedBy: auth.userId,
        deletedReason,
      })
      .where(eq(transferItems.id, itemId));

    return Response.json({ message: "Transfer item cancelled" });
  } catch (error) {
    console.error("DELETE /api/transfer-items/[id] error:", error);
    return Response.json({ error: "Failed to cancel transfer item" }, { status: 500 });
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
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return Response.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const item = await loadItem(itemId);
    if (!item) {
      return Response.json({ error: "Transfer item not found" }, { status: 404 });
    }
    if (item.status !== "Cancelled") {
      return Response.json({ error: "Only cancelled items can be restored" }, { status: 400 });
    }

    const [parent] = await db.select().from(transfers).where(eq(transfers.id, item.transferId));
    if (!parent || parent.status !== "Draft") {
      return Response.json(
        { error: "Items can only be restored on draft transfers" },
        { status: 400 }
      );
    }

    const available = await getStockAtLocation(item.productId, parent.fromLocationId);
    const draftQty = await getDraftItemsQty(item.transferId, item.productId, itemId);
    const qty = Number(item.qty) || 0;
    if (qty + draftQty > available) {
      return Response.json(
        { error: `Insufficient stock at from-location. Available: ${available.toFixed(4)}` },
        { status: 400 }
      );
    }

    const [data] = await db
      .update(transferItems)
      .set({
        status: "Draft",
        deletedAt: null,
        deletedBy: null,
        deletedReason: null,
        updatedAt: new Date(),
        updatedBy: auth.userId,
      })
      .where(eq(transferItems.id, itemId))
      .returning();

    return Response.json({ data: { ...data, seriesNo: formatTransferItemNo(data.id) } });
  } catch (error) {
    console.error("PATCH /api/transfer-items/[id] error:", error);
    return Response.json({ error: "Failed to restore transfer item" }, { status: 500 });
  }
}
