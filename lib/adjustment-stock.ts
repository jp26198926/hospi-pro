import { db } from "@/lib/db";
import { adjustments, products, stockLevels, stockMovements } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getTransTypeIdByName } from "@/lib/receivings";
import { formatAdjustmentNo } from "@/lib/validations/adjustment";
import {
  consumeFefo,
  defaultBatchNo,
  fmtQty,
  toNum,
  upsertInventoryBatch,
} from "@/lib/fefo";

export async function getStockAtLocation(productId: number, locationId: number) {
  const [level] = await db
    .select()
    .from(stockLevels)
    .where(
      and(eq(stockLevels.productId, productId), eq(stockLevels.locationId, locationId))
    );
  return level ? toNum(level.qty) : 0;
}

async function upsertStockLevel(
  tx: {
    select: typeof db.select;
    insert: typeof db.insert;
    update: typeof db.update;
  },
  productId: number,
  locationId: number,
  qty: number,
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
      .set({ qty: fmtQty(qty), updatedAt: new Date(), updatedBy: userId })
      .where(eq(stockLevels.id, level.id));
  } else {
    await tx.insert(stockLevels).values({
      productId,
      locationId,
      qty: fmtQty(qty),
      updatedBy: userId,
    });
  }
}

export async function createAdjustment(
  input: {
    date: Date;
    locationId: number;
    productId: number;
    qtyAdj: number;
    remarks: string | null;
  },
  userId: number
) {
  const transTypeId = await getTransTypeIdByName("Adjustment");
  return db.transaction(async (tx) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.id, input.productId));
    if (!product) {
      throw new Error("Product not found");
    }
    const uomId = product.uomId;

    const [level] = await tx
      .select()
      .from(stockLevels)
      .where(
        and(
          eq(stockLevels.productId, input.productId),
          eq(stockLevels.locationId, input.locationId)
        )
      );
    const qtyOld = level ? toNum(level.qty) : 0;
    const qtyAdj = input.qtyAdj;
    const qtyNew = qtyOld + qtyAdj;

    const [row] = await tx
      .insert(adjustments)
      .values({
        date: input.date,
        locationId: input.locationId,
        productId: input.productId,
        uomId,
        qtyOld: fmtQty(qtyOld),
        qtyAdj: fmtQty(qtyAdj),
        qtyNew: fmtQty(qtyNew),
        remarks: input.remarks,
        status: "Completed",
        createdBy: userId,
      })
      .returning();

    const ref = formatAdjustmentNo(row.id);

    if (qtyAdj > 0) {
      const batchNo = defaultBatchNo("ADJ", row.id);
      const batch = await upsertInventoryBatch(tx, {
        productId: input.productId,
        locationId: input.locationId,
        batchNo,
        dateExpiry: null,
        qtyDelta: qtyAdj,
        sourceType: "Adjustment",
        sourceItemId: row.id,
        userId,
      });

      await tx.insert(stockMovements).values({
        date: input.date,
        transTypeId,
        productId: input.productId,
        locationId: input.locationId,
        qty: fmtQty(qtyAdj),
        referenceTransId: row.id,
        referenceItemId: null,
        referenceDescription: ref,
        batchId: batch.id,
        batchNo: batch.batchNo,
        remarks: input.remarks,
        createdBy: userId,
      });
    } else if (qtyAdj < 0) {
      const takes = await consumeFefo(tx, {
        productId: input.productId,
        locationId: input.locationId,
        need: Math.abs(qtyAdj),
      });

      for (const take of takes) {
        await tx.insert(stockMovements).values({
          date: input.date,
          transTypeId,
          productId: input.productId,
          locationId: input.locationId,
          qty: fmtQty(-take.qty),
          referenceTransId: row.id,
          referenceItemId: null,
          referenceDescription: ref,
          batchId: take.batchId,
          batchNo: take.batchNo,
          remarks: input.remarks,
          createdBy: userId,
        });
      }
    }

    await upsertStockLevel(tx, input.productId, input.locationId, qtyNew, userId);

    await tx
      .update(products)
      .set({ stock: fmtQty(toNum(product.stock) + qtyAdj) })
      .where(eq(products.id, input.productId));

    return { ...row, transNo: ref };
  });
}

export async function cancelAdjustment(
  adjustmentId: number,
  userId: number,
  deletedReason: string | null
) {
  const cancelTypeId = await getTransTypeIdByName("Adjustment Cancel");
  const adjTypeId = await getTransTypeIdByName("Adjustment");
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(adjustments)
      .where(eq(adjustments.id, adjustmentId));
    if (!row) throw new Error("Adjustment not found");
    if (row.status === "Cancelled") throw new Error("Adjustment is already cancelled");

    const qtyAdj = toNum(row.qtyAdj);
    const reverseQty = -qtyAdj;
    const ref = formatAdjustmentNo(row.id);
    const remarks = deletedReason || "Adjustment cancelled";

    const origMovements = await tx
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.referenceTransId, row.id),
          eq(stockMovements.transTypeId, adjTypeId)
        )
      );

    if (origMovements.length > 0) {
      for (const m of origMovements) {
        const mQty = toNum(m.qty);
        if (mQty === 0) continue;
        const mReverse = -mQty;

        if (m.batchNo) {
          await upsertInventoryBatch(tx, {
            productId: row.productId,
            locationId: row.locationId,
            batchNo: m.batchNo,
            dateExpiry: null,
            qtyDelta: mReverse,
            sourceType: "Adjustment Cancel",
            sourceItemId: row.id,
            userId,
          });
        }

        await tx.insert(stockMovements).values({
          date: new Date(),
          transTypeId: cancelTypeId,
          productId: row.productId,
          locationId: row.locationId,
          qty: fmtQty(mReverse),
          referenceTransId: row.id,
          referenceItemId: null,
          referenceDescription: ref,
          batchId: m.batchId,
          batchNo: m.batchNo,
          remarks,
          createdBy: userId,
        });
      }
    } else {
      await tx.insert(stockMovements).values({
        date: new Date(),
        transTypeId: cancelTypeId,
        productId: row.productId,
        locationId: row.locationId,
        qty: fmtQty(reverseQty),
        referenceTransId: row.id,
        referenceItemId: null,
        referenceDescription: ref,
        remarks,
        createdBy: userId,
      });
    }

    const [level] = await tx
      .select()
      .from(stockLevels)
      .where(
        and(
          eq(stockLevels.productId, row.productId),
          eq(stockLevels.locationId, row.locationId)
        )
      );
    const levelQty = level ? toNum(level.qty) : 0;
    const newLevelQty = levelQty + reverseQty;
    if (level) {
      await upsertStockLevel(tx, row.productId, row.locationId, newLevelQty, userId);
    } else if (newLevelQty > 0) {
      await upsertStockLevel(tx, row.productId, row.locationId, newLevelQty, userId);
    }

    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.id, row.productId));
    if (product) {
      await tx
        .update(products)
        .set({ stock: fmtQty(toNum(product.stock) + reverseQty) })
        .where(eq(products.id, row.productId));
    }

    const [updated] = await tx
      .update(adjustments)
      .set({
        status: "Cancelled",
        deletedAt: new Date(),
        deletedBy: userId,
        deletedReason,
      })
      .where(eq(adjustments.id, adjustmentId))
      .returning();

    return updated;
  });
}
