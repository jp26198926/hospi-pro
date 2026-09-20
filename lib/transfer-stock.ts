import { db } from "@/lib/db";
import { transfers, transferItems, stockLevels, stockMovements } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getTransTypeIdByName, transferRef } from "@/lib/transfers";

function toNum(v: string | number | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number): string {
  return n.toFixed(4);
}

async function upsertStockLevel(
  tx: {
    select: typeof db.select;
    insert: typeof db.insert;
    update: typeof db.update;
  },
  productId: number,
  locationId: number,
  delta: number,
  userId: number
) {
  const [level] = await tx
    .select()
    .from(stockLevels)
    .where(
      and(eq(stockLevels.productId, productId), eq(stockLevels.locationId, locationId))
    );

  if (level) {
    await tx
      .update(stockLevels)
      .set({
        qty: fmt(toNum(level.qty) + delta),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(stockLevels.id, level.id));
  } else if (delta > 0) {
    await tx.insert(stockLevels).values({
      productId,
      locationId,
      qty: fmt(delta),
      updatedBy: userId,
    });
  } else {
    throw new Error(
      `Insufficient stock at location for product ${productId}. Available: 0.0000`
    );
  }
}

export async function completeTransfer(transferId: number, userId: number) {
  const transferTypeId = await getTransTypeIdByName("Transfer");
  return db.transaction(async (tx) => {
    const [master] = await tx.select().from(transfers).where(eq(transfers.id, transferId));
    if (!master) throw new Error("Transfer not found");
    if (master.status !== "Draft") {
      throw new Error("Only draft transfers can be completed");
    }
    if (!master.toLocationId) {
      throw new Error("To location is required to complete a transfer");
    }
    if (master.fromLocationId === master.toLocationId) {
      throw new Error("From and To locations must be different");
    }

    const draftItems = await tx
      .select()
      .from(transferItems)
      .where(
        and(eq(transferItems.transferId, transferId), eq(transferItems.status, "Draft"))
      );

    if (draftItems.length === 0) {
      throw new Error("No draft items to complete");
    }

    for (const item of draftItems) {
      const qty = toNum(item.qty);
      if (qty <= 0) {
        throw new Error(`Item ${item.id} qty must be greater than 0`);
      }

      const [fromLevel] = await tx
        .select()
        .from(stockLevels)
        .where(
          and(
            eq(stockLevels.productId, item.productId),
            eq(stockLevels.locationId, master.fromLocationId)
          )
        );
      const available = fromLevel ? toNum(fromLevel.qty) : 0;
      if (available < qty) {
        throw new Error(
          `Insufficient stock for item ${item.id}. Available: ${fmt(available)}`
        );
      }

      const ref = transferRef(master.id, item.id);
      const remarks = item.remarks || master.remarks || null;

      await tx.insert(stockMovements).values({
        date: master.date,
        transTypeId: transferTypeId,
        productId: item.productId,
        locationId: master.fromLocationId,
        qty: fmt(-qty),
        referenceTransId: master.id,
        referenceItemId: item.id,
        referenceDescription: ref,
        remarks,
        createdBy: userId,
      });

      await tx.insert(stockMovements).values({
        date: master.date,
        transTypeId: transferTypeId,
        productId: item.productId,
        locationId: master.toLocationId,
        qty: fmt(qty),
        referenceTransId: master.id,
        referenceItemId: item.id,
        referenceDescription: ref,
        remarks,
        createdBy: userId,
      });

      await upsertStockLevel(tx, item.productId, master.fromLocationId, -qty, userId);
      await upsertStockLevel(tx, item.productId, master.toLocationId, qty, userId);

      await tx
        .update(transferItems)
        .set({ status: "Completed", updatedAt: new Date(), updatedBy: userId })
        .where(eq(transferItems.id, item.id));
    }

    const [updated] = await tx
      .update(transfers)
      .set({ status: "Completed", updatedAt: new Date(), updatedBy: userId })
      .where(eq(transfers.id, transferId))
      .returning();

    return updated;
  });
}

export async function cancelCompletedTransfer(
  transferId: number,
  userId: number,
  deletedReason: string | null
) {
  const cancelTypeId = await getTransTypeIdByName("Transfer Cancel");
  return db.transaction(async (tx) => {
    const [master] = await tx.select().from(transfers).where(eq(transfers.id, transferId));
    if (!master) throw new Error("Transfer not found");
    if (master.status !== "Completed") {
      throw new Error("Only completed transfers can reverse stock on cancel");
    }

    const items = await tx
      .select()
      .from(transferItems)
      .where(
        and(
          eq(transferItems.transferId, transferId),
          eq(transferItems.status, "Completed")
        )
      );

    for (const item of items) {
      const qty = toNum(item.qty);
      const ref = transferRef(master.id, item.id);

      await tx.insert(stockMovements).values({
        date: new Date(),
        transTypeId: cancelTypeId,
        productId: item.productId,
        locationId: master.fromLocationId,
        qty: fmt(qty),
        referenceTransId: master.id,
        referenceItemId: item.id,
        referenceDescription: ref,
        remarks: deletedReason || "Transfer cancelled",
        createdBy: userId,
      });

      await tx.insert(stockMovements).values({
        date: new Date(),
        transTypeId: cancelTypeId,
        productId: item.productId,
        locationId: master.toLocationId,
        qty: fmt(-qty),
        referenceTransId: master.id,
        referenceItemId: item.id,
        referenceDescription: ref,
        remarks: deletedReason || "Transfer cancelled",
        createdBy: userId,
      });

      await upsertStockLevel(tx, item.productId, master.fromLocationId, qty, userId);
      await upsertStockLevel(tx, item.productId, master.toLocationId, -qty, userId);

      await tx
        .update(transferItems)
        .set({
          status: "Cancelled",
          deletedAt: new Date(),
          deletedBy: userId,
          deletedReason,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(transferItems.id, item.id));
    }

    await tx
      .update(transfers)
      .set({
        status: "Cancelled",
        deletedAt: new Date(),
        deletedBy: userId,
        deletedReason,
      })
      .where(eq(transfers.id, transferId));
  });
}

export async function getStockAtLocation(
  productId: number,
  locationId: number
): Promise<number> {
  const [level] = await db
    .select()
    .from(stockLevels)
    .where(
      and(eq(stockLevels.productId, productId), eq(stockLevels.locationId, locationId))
    );
  return level ? toNum(level.qty) : 0;
}

export async function getDraftItemsQty(
  transferId: number,
  productId: number,
  excludeItemId?: number
): Promise<number> {
  const rows = await db
    .select()
    .from(transferItems)
    .where(
      and(
        eq(transferItems.transferId, transferId),
        eq(transferItems.productId, productId),
        eq(transferItems.status, "Draft")
      )
    );
  return rows
    .filter((r) => !excludeItemId || r.id !== excludeItemId)
    .reduce((sum, r) => sum + toNum(r.qty), 0);
}
