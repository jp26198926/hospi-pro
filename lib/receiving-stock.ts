import { db } from "@/lib/db";
import {
  receivings,
  receivingItems,
  products,
  stockLevels,
  stockMovements,
  inventoryBatches,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getTransTypeIdByName, receivingRef } from "@/lib/receivings";
import { consumeFefo, defaultBatchNo, fmtQty, toNum, upsertInventoryBatch } from "@/lib/fefo";

export async function completeReceiving(receivingId: number, userId: number) {
  const receivingTypeId = await getTransTypeIdByName("Receiving");
  return db.transaction(async (tx) => {
    const [master] = await tx
      .select()
      .from(receivings)
      .where(eq(receivings.id, receivingId));

    if (!master) throw new Error("Receiving not found");
    if (master.status !== "Draft") throw new Error("Only draft receivings can be completed");

    const draftItems = await tx
      .select()
      .from(receivingItems)
      .where(
        and(
          eq(receivingItems.receivingId, receivingId),
          eq(receivingItems.status, "Draft")
        )
      );

    if (draftItems.length === 0) {
      throw new Error("No draft items to complete");
    }
    for (const item of draftItems) {
      if (toNum(item.qty) <= 0) {
        throw new Error(`Item ${item.id} qty must be greater than 0`);
      }
    }

    for (const item of draftItems) {
      const qty = toNum(item.qty);
      const unitCost = toNum(item.unitCost);
      const batchNo = (item.batchNo || "").trim() || defaultBatchNo("BATCH", item.id);

      const batch = await upsertInventoryBatch(tx, {
        productId: item.productId,
        locationId: master.locationId,
        batchNo,
        dateExpiry: item.dateExpiry,
        qtyDelta: qty,
        unitCost,
        sourceType: "Receiving",
        sourceItemId: item.id,
        userId,
      });

      await tx.insert(stockMovements).values({
        date: master.date,
        transTypeId: receivingTypeId,
        productId: item.productId,
        locationId: master.locationId,
        qty: fmtQty(qty),
        referenceTransId: master.id,
        referenceItemId: item.id,
        referenceDescription: receivingRef(master.id, item.id),
        batchId: batch.id,
        batchNo: batch.batchNo,
        remarks: item.remarks || master.remarks || null,
        createdBy: userId,
      });

      const [level] = await tx
        .select()
        .from(stockLevels)
        .where(
          and(
            eq(stockLevels.productId, item.productId),
            eq(stockLevels.locationId, master.locationId)
          )
        );

      if (level) {
        await tx
          .update(stockLevels)
          .set({
            qty: fmtQty(toNum(level.qty) + qty),
            updatedAt: new Date(),
            updatedBy: userId,
          })
          .where(eq(stockLevels.id, level.id));
      } else {
        await tx.insert(stockLevels).values({
          productId: item.productId,
          locationId: master.locationId,
          qty: fmtQty(qty),
          updatedBy: userId,
        });
      }

      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, item.productId));

      if (product) {
        const prevQty = toNum(product.stock);
        const prevAvg = toNum(product.avgCost);
        const newQty = prevQty + qty;
        const avg =
          newQty > 0 ? (prevQty * prevAvg + qty * unitCost) / newQty : unitCost;

        await tx
          .update(products)
          .set({
            stock: fmtQty(newQty),
            lastCost: fmtQty(unitCost),
            avgCost: fmtQty(avg),
          })
          .where(eq(products.id, item.productId));
      }

      await tx
        .update(receivingItems)
        .set({
          status: "Completed",
          batchNo,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(receivingItems.id, item.id));
    }

    const [updated] = await tx
      .update(receivings)
      .set({ status: "Completed", updatedAt: new Date(), updatedBy: userId })
      .where(eq(receivings.id, receivingId))
      .returning();

    return updated;
  });
}

export async function cancelCompletedReceiving(
  receivingId: number,
  userId: number,
  deletedReason: string | null
) {
  const cancelTypeId = await getTransTypeIdByName("Receiving Cancel");
  return db.transaction(async (tx) => {
    const [master] = await tx
      .select()
      .from(receivings)
      .where(eq(receivings.id, receivingId));

    if (!master) throw new Error("Receiving not found");
    if (master.status !== "Completed") {
      throw new Error("Only completed receivings can reverse stock on cancel");
    }

    const items = await tx
      .select()
      .from(receivingItems)
      .where(
        and(
          eq(receivingItems.receivingId, receivingId),
          eq(receivingItems.status, "Completed")
        )
      );

    for (const item of items) {
      const qty = toNum(item.qty);
      const unitCost = toNum(item.unitCost);
      const batchNo = (item.batchNo || "").trim() || defaultBatchNo("BATCH", item.id);

      await upsertInventoryBatch(tx, {
        productId: item.productId,
        locationId: master.locationId,
        batchNo,
        dateExpiry: item.dateExpiry,
        qtyDelta: -qty,
        sourceType: "Receiving Cancel",
        sourceItemId: item.id,
        userId,
      });

      const [batchRow] = await tx
        .select()
        .from(inventoryBatches)
        .where(
          and(
            eq(inventoryBatches.productId, item.productId),
            eq(inventoryBatches.locationId, master.locationId),
            eq(inventoryBatches.batchNo, batchNo)
          )
        );

      await tx.insert(stockMovements).values({
        date: new Date(),
        transTypeId: cancelTypeId,
        productId: item.productId,
        locationId: master.locationId,
        qty: fmtQty(-qty),
        referenceTransId: master.id,
        referenceItemId: item.id,
        referenceDescription: receivingRef(master.id, item.id),
        batchId: batchRow?.id ?? null,
        batchNo,
        remarks: deletedReason || "Receiving cancelled",
        createdBy: userId,
      });

      const [level] = await tx
        .select()
        .from(stockLevels)
        .where(
          and(
            eq(stockLevels.productId, item.productId),
            eq(stockLevels.locationId, master.locationId)
          )
        );

      if (level) {
        await tx
          .update(stockLevels)
          .set({
            qty: fmtQty(toNum(level.qty) - qty),
            updatedAt: new Date(),
            updatedBy: userId,
          })
          .where(eq(stockLevels.id, level.id));
      }

      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, item.productId));

      if (product) {
        const prevQty = toNum(product.stock);
        const prevAvg = toNum(product.avgCost);
        const newQty = Math.max(0, prevQty - qty);
        let avg = prevAvg;
        if (prevQty > 0) {
          const total = prevQty * prevAvg - qty * unitCost;
          avg = newQty > 0 ? total / newQty : 0;
        }
        await tx
          .update(products)
          .set({
            stock: fmtQty(newQty),
            avgCost: fmtQty(Math.max(0, avg)),
          })
          .where(eq(products.id, item.productId));
      }

      await tx
        .update(receivingItems)
        .set({
          status: "Cancelled",
          deletedAt: new Date(),
          deletedBy: userId,
          deletedReason,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(receivingItems.id, item.id));
    }

    await tx
      .update(receivings)
      .set({
        status: "Cancelled",
        deletedAt: new Date(),
        deletedBy: userId,
        deletedReason,
      })
      .where(eq(receivings.id, receivingId));
  });
}

// re-export for callers that used local helpers
export { toNum, fmtQty };
void consumeFefo;
