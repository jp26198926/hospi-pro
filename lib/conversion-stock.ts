import { db } from "@/lib/db";
import { conversions, products, stockLevels, stockMovements } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getTransTypeIdByName } from "@/lib/receivings";
import { formatConversionNo } from "@/lib/validations/conversion";

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
  } else if (qty > 0) {
    await tx.insert(stockLevels).values({
      productId,
      locationId,
      qty: fmt(qty),
      updatedBy: userId,
    });
  } else {
    throw new Error(`Insufficient stock at location for product ${productId}`);
  }
}

export async function createConversion(
  input: {
    date: Date;
    locationId: number;
    fromProductId: number;
    fromQty: number;
    toProductId: number;
    newQty: number;
    remarks: string | null;
  },
  userId: number
) {
  if (input.fromProductId === input.toProductId) {
    throw new Error("From product and To product must be different");
  }

  const transTypeId = await getTransTypeIdByName("Conversion");
  return db.transaction(async (tx) => {
    const [fromProduct] = await tx
      .select()
      .from(products)
      .where(eq(products.id, input.fromProductId));
    const [toProduct] = await tx
      .select()
      .from(products)
      .where(eq(products.id, input.toProductId));

    if (!fromProduct || !toProduct) {
      throw new Error("Product not found");
    }
    if (fromProduct.status === "Deleted" || toProduct.status === "Deleted") {
      throw new Error("Products must be active");
    }

    const [level] = await tx
      .select()
      .from(stockLevels)
      .where(
        and(
          eq(stockLevels.productId, input.fromProductId),
          eq(stockLevels.locationId, input.locationId)
        )
      );
    const available = level ? toNum(level.qty) : 0;
    if (available < input.fromQty) {
      throw new Error(
        `Insufficient stock for from-product. Available: ${fmt(available)}`
      );
    }

    const [row] = await tx
      .insert(conversions)
      .values({
        date: input.date,
        locationId: input.locationId,
        fromProductId: input.fromProductId,
        fromUomId: fromProduct.uomId,
        fromQty: fmt(input.fromQty),
        toProductId: input.toProductId,
        toUomId: toProduct.uomId,
        newQty: fmt(input.newQty),
        remarks: input.remarks,
        status: "Completed",
        createdBy: userId,
      })
      .returning();

    const ref = formatConversionNo(row.id);

    await tx.insert(stockMovements).values({
      date: input.date,
      transTypeId,
      productId: input.fromProductId,
      locationId: input.locationId,
      qty: fmt(-input.fromQty),
      referenceTransId: row.id,
      referenceItemId: null,
      referenceDescription: ref,
      remarks: input.remarks,
      createdBy: userId,
    });

    await tx.insert(stockMovements).values({
      date: input.date,
      transTypeId,
      productId: input.toProductId,
      locationId: input.locationId,
      qty: fmt(input.newQty),
      referenceTransId: row.id,
      referenceItemId: null,
      referenceDescription: ref,
      remarks: input.remarks,
      createdBy: userId,
    });

    await upsertStockLevel(
      tx,
      input.fromProductId,
      input.locationId,
      available - input.fromQty,
      userId
    );
    await upsertStockLevel(
      tx,
      input.toProductId,
      input.locationId,
      toNum(toProduct.stock) + input.newQty,
      userId
    );

    await tx
      .update(products)
      .set({ stock: fmt(toNum(fromProduct.stock) - input.fromQty) })
      .where(eq(products.id, input.fromProductId));
    await tx
      .update(products)
      .set({ stock: fmt(toNum(toProduct.stock) + input.newQty) })
      .where(eq(products.id, input.toProductId));

    return { ...row, transNo: ref };
  });
}

export async function cancelConversion(
  conversionId: number,
  userId: number,
  deletedReason: string | null
) {
  const cancelTypeId = await getTransTypeIdByName("Conversion Cancel");
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(conversions)
      .where(eq(conversions.id, conversionId));
    if (!row) throw new Error("Conversion not found");
    if (row.status === "Cancelled") throw new Error("Conversion is already cancelled");

    const fromQty = toNum(row.fromQty);
    const newQty = toNum(row.newQty);
    const ref = formatConversionNo(row.id);

    await tx.insert(stockMovements).values({
      date: new Date(),
      transTypeId: cancelTypeId,
      productId: row.fromProductId,
      locationId: row.locationId,
      qty: fmt(fromQty),
      referenceTransId: row.id,
      referenceItemId: null,
      referenceDescription: ref,
      remarks: deletedReason || "Conversion cancelled",
      createdBy: userId,
    });

    await tx.insert(stockMovements).values({
      date: new Date(),
      transTypeId: cancelTypeId,
      productId: row.toProductId,
      locationId: row.locationId,
      qty: fmt(-newQty),
      referenceTransId: row.id,
      referenceItemId: null,
      referenceDescription: ref,
      remarks: deletedReason || "Conversion cancelled",
      createdBy: userId,
    });

    const [fromLevel] = await tx
      .select()
      .from(stockLevels)
      .where(
        and(
          eq(stockLevels.productId, row.fromProductId),
          eq(stockLevels.locationId, row.locationId)
        )
      );
    const [toLevel] = await tx
      .select()
      .from(stockLevels)
      .where(
        and(
          eq(stockLevels.productId, row.toProductId),
          eq(stockLevels.locationId, row.locationId)
        )
      );

    await upsertStockLevel(
      tx,
      row.fromProductId,
      row.locationId,
      (fromLevel ? toNum(fromLevel.qty) : 0) + fromQty,
      userId
    );
    await upsertStockLevel(
      tx,
      row.toProductId,
      row.locationId,
      (toLevel ? toNum(toLevel.qty) : 0) - newQty,
      userId
    );

    const [fromProduct] = await tx
      .select()
      .from(products)
      .where(eq(products.id, row.fromProductId));
    const [toProduct] = await tx
      .select()
      .from(products)
      .where(eq(products.id, row.toProductId));

    if (fromProduct) {
      await tx
        .update(products)
        .set({ stock: fmt(toNum(fromProduct.stock) + fromQty) })
        .where(eq(products.id, row.fromProductId));
    }
    if (toProduct) {
      await tx
        .update(products)
        .set({ stock: fmt(toNum(toProduct.stock) - newQty) })
        .where(eq(products.id, row.toProductId));
    }

    const [updated] = await tx
      .update(conversions)
      .set({
        status: "Cancelled",
        deletedAt: new Date(),
        deletedBy: userId,
        deletedReason,
      })
      .where(eq(conversions.id, conversionId))
      .returning();

    return updated;
  });
}
