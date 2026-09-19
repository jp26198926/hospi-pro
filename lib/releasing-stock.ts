import { db } from "@/lib/db";
import {
  releasings,
  releasingItems,
  products,
  stockLevels,
  stockMovements,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getTransTypeIdByName, releasingRef } from "@/lib/releasings";

function toNum(v: string | number | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number): string {
  return n.toFixed(4);
}

export async function completeReleasing(releasingId: number, userId: number) {
  const releasingTypeId = await getTransTypeIdByName("Releasing");
  return db.transaction(async (tx) => {
    const [master] = await tx
      .select()
      .from(releasings)
      .where(eq(releasings.id, releasingId));

    if (!master) throw new Error("Releasing not found");
    if (master.status !== "Draft") {
      throw new Error("Only draft releasings can be completed");
    }

    const draftItems = await tx
      .select()
      .from(releasingItems)
      .where(
        and(
          eq(releasingItems.releasingId, releasingId),
          eq(releasingItems.status, "Draft")
        )
      );

    if (draftItems.length === 0) {
      throw new Error("No draft items to complete");
    }

    for (const item of draftItems) {
      const qty = toNum(item.qty);
      if (qty <= 0) {
        throw new Error(`Item ${item.id} qty must be greater than 0`);
      }

      const [level] = await tx
        .select()
        .from(stockLevels)
        .where(
          and(
            eq(stockLevels.productId, item.productId),
            eq(stockLevels.locationId, master.fromLocationId)
          )
        );
      const available = level ? toNum(level.qty) : 0;
      if (available < qty) {
        throw new Error(
          `Insufficient stock for item ${item.id}. Available: ${fmt(available)}`
        );
      }

      await tx.insert(stockMovements).values({
        date: master.date,
        transTypeId: releasingTypeId,
        productId: item.productId,
        locationId: master.fromLocationId,
        qty: fmt(-qty),
        referenceTransId: master.id,
        referenceItemId: item.id,
        referenceDescription: releasingRef(master.id, item.id),
        remarks: item.remarks || master.remarks || null,
        createdBy: userId,
      });

      if (level) {
        await tx
          .update(stockLevels)
          .set({
            qty: fmt(toNum(level.qty) - qty),
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
        await tx
          .update(products)
          .set({ stock: fmt(Math.max(0, prevQty - qty)) })
          .where(eq(products.id, item.productId));
      }

      await tx
        .update(releasingItems)
        .set({ status: "Completed", updatedAt: new Date(), updatedBy: userId })
        .where(eq(releasingItems.id, item.id));
    }

    const [updated] = await tx
      .update(releasings)
      .set({ status: "Completed", updatedAt: new Date(), updatedBy: userId })
      .where(eq(releasings.id, releasingId))
      .returning();

    return updated;
  });
}

export async function cancelCompletedReleasing(
  releasingId: number,
  userId: number,
  deletedReason: string | null
) {
  const cancelTypeId = await getTransTypeIdByName("Releasing Cancel");
  return db.transaction(async (tx) => {
    const [master] = await tx
      .select()
      .from(releasings)
      .where(eq(releasings.id, releasingId));

    if (!master) throw new Error("Releasing not found");
    if (master.status !== "Completed") {
      throw new Error("Only completed releasings can reverse stock on cancel");
    }

    const items = await tx
      .select()
      .from(releasingItems)
      .where(
        and(
          eq(releasingItems.releasingId, releasingId),
          eq(releasingItems.status, "Completed")
        )
      );

    for (const item of items) {
      const qty = toNum(item.qty);

      await tx.insert(stockMovements).values({
        date: new Date(),
        transTypeId: cancelTypeId,
        productId: item.productId,
        locationId: master.fromLocationId,
        qty: fmt(qty),
        referenceTransId: master.id,
        referenceItemId: item.id,
        referenceDescription: releasingRef(master.id, item.id),
        remarks: deletedReason || "Releasing cancelled",
        createdBy: userId,
      });

      const [level] = await tx
        .select()
        .from(stockLevels)
        .where(
          and(
            eq(stockLevels.productId, item.productId),
            eq(stockLevels.locationId, master.fromLocationId)
          )
        );

      if (level) {
        await tx
          .update(stockLevels)
          .set({
            qty: fmt(toNum(level.qty) + qty),
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
        await tx
          .update(products)
          .set({ stock: fmt(toNum(product.stock) + qty) })
          .where(eq(products.id, item.productId));
      }

      await tx
        .update(releasingItems)
        .set({
          status: "Cancelled",
          deletedAt: new Date(),
          deletedBy: userId,
          deletedReason,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(releasingItems.id, item.id));
    }

    await tx
      .update(releasings)
      .set({
        status: "Cancelled",
        deletedAt: new Date(),
        deletedBy: userId,
        deletedReason,
      })
      .where(eq(releasings.id, releasingId));
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
      and(
        eq(stockLevels.productId, productId),
        eq(stockLevels.locationId, locationId)
      )
    );
  return level ? toNum(level.qty) : 0;
}

export async function getDraftItemsQty(
  releasingId: number,
  productId: number,
  excludeItemId?: number
): Promise<number> {
  const { inArray } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(releasingItems)
    .where(
      and(
        eq(releasingItems.releasingId, releasingId),
        eq(releasingItems.productId, productId),
        eq(releasingItems.status, "Draft")
      )
    );
  return rows
    .filter((r) => !excludeItemId || r.id !== excludeItemId)
    .reduce((sum, r) => sum + toNum(r.qty), 0);
}
