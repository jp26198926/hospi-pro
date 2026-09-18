import { db } from "@/lib/db";
import {
  receivings,
  receivingItems,
  products,
  stockLevels,
  stockMovements,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getTransTypeIdByName, receivingRef } from "@/lib/receivings";

function toNum(v: string | number | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number): string {
  return n.toFixed(4);
}

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

      await tx.insert(stockMovements).values({
        date: master.date,
        transTypeId: receivingTypeId,
        productId: item.productId,
        locationId: master.locationId,
        qty: fmt(qty),
        referenceTransId: master.id,
        referenceItemId: item.id,
        referenceDescription: receivingRef(master.id, item.id),
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
            qty: fmt(toNum(level.qty) + qty),
            updatedAt: new Date(),
            updatedBy: userId,
          })
          .where(eq(stockLevels.id, level.id));
      } else {
        await tx.insert(stockLevels).values({
          productId: item.productId,
          locationId: master.locationId,
          qty: fmt(qty),
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
            stock: fmt(newQty),
            lastCost: fmt(unitCost),
            avgCost: fmt(avg),
          })
          .where(eq(products.id, item.productId));
      }

      await tx
        .update(receivingItems)
        .set({ status: "Completed", updatedAt: new Date(), updatedBy: userId })
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
  cancelledReason: string | null
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

      await tx.insert(stockMovements).values({
        date: new Date(),
        transTypeId: cancelTypeId,
        productId: item.productId,
        locationId: master.locationId,
        qty: fmt(-qty),
        referenceTransId: master.id,
        referenceItemId: item.id,
        referenceDescription: receivingRef(master.id, item.id),
        remarks: cancelledReason || "Receiving cancelled",
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
            stock: fmt(newQty),
            avgCost: fmt(Math.max(0, avg)),
          })
          .where(eq(products.id, item.productId));
      }

      await tx
        .update(receivingItems)
        .set({
          status: "Cancelled",
          cancelledAt: new Date(),
          cancelledBy: userId,
          cancelledReason,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(receivingItems.id, item.id));
    }

    await tx
      .update(receivings)
      .set({
        status: "Cancelled",
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancelledReason,
      })
      .where(eq(receivings.id, receivingId));
  });
}
