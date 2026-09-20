import { db } from "@/lib/db";
import { adjustments, products, stockLevels, stockMovements } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getTransTypeIdByName } from "@/lib/receivings";
import { formatAdjustmentNo } from "@/lib/validations/adjustment";

function toNum(v: string | number | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number): string {
  return n.toFixed(4);
}

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
      .set({ qty: fmt(qty), updatedAt: new Date(), updatedBy: userId })
      .where(eq(stockLevels.id, level.id));
  } else {
    await tx.insert(stockLevels).values({
      productId,
      locationId,
      qty: fmt(qty),
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
        qtyOld: fmt(qtyOld),
        qtyAdj: fmt(qtyAdj),
        qtyNew: fmt(qtyNew),
        remarks: input.remarks,
        status: "Completed",
        createdBy: userId,
      })
      .returning();

    await tx.insert(stockMovements).values({
      date: input.date,
      transTypeId,
      productId: input.productId,
      locationId: input.locationId,
      qty: fmt(qtyAdj),
      referenceTransId: row.id,
      referenceItemId: null,
      referenceDescription: formatAdjustmentNo(row.id),
      remarks: input.remarks,
      createdBy: userId,
    });

    await upsertStockLevel(tx, input.productId, input.locationId, qtyNew, userId);

    await tx
      .update(products)
      .set({ stock: fmt(toNum(product.stock) + qtyAdj) })
      .where(eq(products.id, input.productId));

    return { ...row, transNo: formatAdjustmentNo(row.id) };
  });
}

export async function cancelAdjustment(
  adjustmentId: number,
  userId: number,
  deletedReason: string | null
) {
  const transTypeId = await getTransTypeIdByName("Adjustment");
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(adjustments)
      .where(eq(adjustments.id, adjustmentId));
    if (!row) throw new Error("Adjustment not found");
    if (row.status === "Cancelled") throw new Error("Adjustment is already cancelled");

    const qtyAdj = toNum(row.qtyAdj);
    const reverseQty = -qtyAdj;

    await tx.insert(stockMovements).values({
      date: new Date(),
      transTypeId,
      productId: row.productId,
      locationId: row.locationId,
      qty: fmt(reverseQty),
      referenceTransId: row.id,
      referenceItemId: null,
      referenceDescription: formatAdjustmentNo(row.id),
      remarks: deletedReason || "Adjustment cancelled",
      createdBy: userId,
    });

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
        .set({ stock: fmt(toNum(product.stock) + reverseQty) })
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
