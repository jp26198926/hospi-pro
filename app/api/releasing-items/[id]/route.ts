import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { releasingItems, releasings } from "@/lib/db/schema";
import { releasingItemSchema, formatReleasingItemNo } from "@/lib/validations/releasing-item";
import { getDraftItemsQty, getStockAtLocation } from "@/lib/releasing-stock";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

async function loadItem(id: number) {
  const [row] = await db
    .select()
    .from(releasingItems)
    .where(eq(releasingItems.id, id));
  return row;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/releasings", "Edit");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return Response.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const item = await loadItem(itemId);
    if (!item) {
      return Response.json({ error: "Releasing item not found" }, { status: 404 });
    }

    const [parent] = await db
      .select()
      .from(releasings)
      .where(eq(releasings.id, item.releasingId));
    if (!parent || parent.status !== "Draft" || item.status !== "Draft") {
      return Response.json(
        { error: "Only draft items on draft releasings can be edited" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = releasingItemSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const available = await getStockAtLocation(
      parsed.data.productId,
      parent.fromLocationId
    );
    const draftQty = await getDraftItemsQty(
      item.releasingId,
      parsed.data.productId,
      itemId
    );
    if (parsed.data.qty + draftQty > available) {
      return Response.json(
        {
          error: `Insufficient stock at location. Available: ${available.toFixed(4)}`,
        },
        { status: 400 }
      );
    }

    const [data] = await db
      .update(releasingItems)
      .set({
        productId: parsed.data.productId,
        qty: parsed.data.qty.toFixed(4),
        dateExpiry: parsed.data.dateExpiry || null,
        remarks: parsed.data.remarks || null,
        updatedAt: new Date(),
        updatedBy: auth.userId,
      })
      .where(eq(releasingItems.id, itemId))
      .returning();

    return Response.json({
      data: { ...data, seriesNo: formatReleasingItemNo(data.id) },
    });
  } catch (error) {
    console.error("PUT /api/releasing-items/[id] error:", error);
    return Response.json({ error: "Failed to update releasing item" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/releasings", "Delete");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return Response.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const item = await loadItem(itemId);
    if (!item) {
      return Response.json({ error: "Releasing item not found" }, { status: 404 });
    }
    if (item.status !== "Draft") {
      return Response.json({ error: "Only draft items can be cancelled" }, { status: 400 });
    }

    const [parent] = await db
      .select()
      .from(releasings)
      .where(eq(releasings.id, item.releasingId));
    if (!parent || parent.status !== "Draft") {
      return Response.json(
        { error: "Items can only be cancelled on draft releasings" },
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
      .update(releasingItems)
      .set({
        status: "Cancelled",
        deletedAt: new Date(),
        deletedBy: auth.userId,
        deletedReason,
      })
      .where(eq(releasingItems.id, itemId));

    return Response.json({ message: "Releasing item cancelled" });
  } catch (error) {
    console.error("DELETE /api/releasing-items/[id] error:", error);
    return Response.json({ error: "Failed to cancel releasing item" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/releasings", "Restore");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return Response.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const item = await loadItem(itemId);
    if (!item) {
      return Response.json({ error: "Releasing item not found" }, { status: 404 });
    }
    if (item.status !== "Cancelled") {
      return Response.json({ error: "Only cancelled items can be restored" }, { status: 400 });
    }

    const [parent] = await db
      .select()
      .from(releasings)
      .where(eq(releasings.id, item.releasingId));
    if (!parent || parent.status !== "Draft") {
      return Response.json(
        { error: "Items can only be restored on draft releasings" },
        { status: 400 }
      );
    }

    const available = await getStockAtLocation(item.productId, parent.fromLocationId);
    const draftQty = await getDraftItemsQty(item.releasingId, item.productId, itemId);
    const qty = Number(item.qty) || 0;
    if (qty + draftQty > available) {
      return Response.json(
        {
          error: `Insufficient stock at location. Available: ${available.toFixed(4)}`,
        },
        { status: 400 }
      );
    }

    const [data] = await db
      .update(releasingItems)
      .set({
        status: "Draft",
        deletedAt: null,
        deletedBy: null,
        deletedReason: null,
        updatedAt: new Date(),
        updatedBy: auth.userId,
      })
      .where(eq(releasingItems.id, itemId))
      .returning();

    return Response.json({
      data: { ...data, seriesNo: formatReleasingItemNo(data.id) },
    });
  } catch (error) {
    console.error("PATCH /api/releasing-items/[id] error:", error);
    return Response.json({ error: "Failed to restore releasing item" }, { status: 500 });
  }
}
