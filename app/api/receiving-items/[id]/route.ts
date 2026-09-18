import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { receivingItems, receivings } from "@/lib/db/schema";
import { receivingItemSchema, formatBatchNo } from "@/lib/validations/receiving-item";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

async function loadItem(id: number) {
  const [row] = await db
    .select()
    .from(receivingItems)
    .where(eq(receivingItems.id, id));
  return row;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/receivings", "Read");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return Response.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const data = await loadItem(itemId);
    if (!data) {
      return Response.json({ error: "Receiving item not found" }, { status: 404 });
    }

    return Response.json({ data: { ...data, batchNo: formatBatchNo(data.id) } });
  } catch (error) {
    console.error("GET /api/receiving-items/[id] error:", error);
    return Response.json({ error: "Failed to fetch receiving item" }, { status: 500 });
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
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return Response.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const item = await loadItem(itemId);
    if (!item) {
      return Response.json({ error: "Receiving item not found" }, { status: 404 });
    }

    const [parent] = await db
      .select()
      .from(receivings)
      .where(eq(receivings.id, item.receivingId));

    if (!parent || parent.status !== "Draft" || item.status !== "Draft") {
      return Response.json(
        { error: "Only draft items on draft receivings can be edited" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = receivingItemSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const totalCost = parsed.data.qty * parsed.data.unitCost;

    const [data] = await db
      .update(receivingItems)
      .set({
        productId: parsed.data.productId,
        qty: parsed.data.qty.toFixed(4),
        unitCost: parsed.data.unitCost.toFixed(4),
        totalCost: totalCost.toFixed(4),
        dateExpiry: parsed.data.dateExpiry || null,
        remarks: parsed.data.remarks || null,
        updatedAt: new Date(),
        updatedBy: auth.userId,
      })
      .where(eq(receivingItems.id, itemId))
      .returning();

    return Response.json({ data: { ...data, batchNo: formatBatchNo(data.id) } });
  } catch (error) {
    console.error("PUT /api/receiving-items/[id] error:", error);
    return Response.json({ error: "Failed to update receiving item" }, { status: 500 });
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
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return Response.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const item = await loadItem(itemId);
    if (!item) {
      return Response.json({ error: "Receiving item not found" }, { status: 404 });
    }
    if (item.status !== "Draft") {
      return Response.json({ error: "Only draft items can be cancelled" }, { status: 400 });
    }

    const [parent] = await db
      .select()
      .from(receivings)
      .where(eq(receivings.id, item.receivingId));
    if (!parent || parent.status !== "Draft") {
      return Response.json(
        { error: "Items can only be cancelled on draft receivings" },
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
      .update(receivingItems)
      .set({
        status: "Cancelled",
        deletedAt: new Date(),
        deletedBy: auth.userId,
        deletedReason,
      })
      .where(eq(receivingItems.id, itemId));

    return Response.json({ message: "Receiving item cancelled" });
  } catch (error) {
    console.error("DELETE /api/receiving-items/[id] error:", error);
    return Response.json({ error: "Failed to cancel receiving item" }, { status: 500 });
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
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return Response.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const item = await loadItem(itemId);
    if (!item) {
      return Response.json({ error: "Receiving item not found" }, { status: 404 });
    }
    if (item.status !== "Cancelled") {
      return Response.json({ error: "Only cancelled items can be restored" }, { status: 400 });
    }

    const [parent] = await db
      .select()
      .from(receivings)
      .where(eq(receivings.id, item.receivingId));
    if (!parent || parent.status !== "Draft") {
      return Response.json(
        { error: "Items can only be restored on draft receivings" },
        { status: 400 }
      );
    }

    const [data] = await db
      .update(receivingItems)
      .set({
        status: "Draft",
        deletedAt: null,
        deletedBy: null,
        deletedReason: null,
        updatedAt: new Date(),
        updatedBy: auth.userId,
      })
      .where(eq(receivingItems.id, itemId))
      .returning();

    return Response.json({ data: { ...data, batchNo: formatBatchNo(data.id) } });
  } catch (error) {
    console.error("PATCH /api/receiving-items/[id] error:", error);
    return Response.json({ error: "Failed to restore receiving item" }, { status: 500 });
  }
}
