import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import type { db } from "@/lib/db";
import { inventoryBatches } from "@/lib/db/schema";

export type Tx = Pick<typeof db, "select" | "insert" | "update">;

export function toNum(v: string | number | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function fmtQty(n: number): string {
  return n.toFixed(4);
}

export function defaultBatchNo(prefix: string, id: number): string {
  return `${prefix}-${String(id).padStart(6, "0")}`;
}

export interface BatchTake {
  batchId: number;
  batchNo: string;
  dateExpiry: Date | null;
  qty: number;
}

export async function upsertInventoryBatch(
  tx: Tx,
  input: {
    productId: number;
    locationId: number;
    batchNo: string;
    dateExpiry: Date | null;
    qtyDelta: number;
    unitCost?: number;
    sourceType?: string;
    sourceItemId?: number | null;
    userId: number;
  }
): Promise<{ id: number; batchNo: string; dateExpiry: Date | null; qty: number }> {
  const { productId, locationId, batchNo, dateExpiry, qtyDelta } = input;
  const [existing] = await tx
    .select()
    .from(inventoryBatches)
    .where(
      and(
        eq(inventoryBatches.productId, productId),
        eq(inventoryBatches.locationId, locationId),
        eq(inventoryBatches.batchNo, batchNo)
      )
    );

  if (existing) {
    const newQty = toNum(existing.qty) + qtyDelta;
    if (newQty < 0) {
      throw new Error(
        `Batch ${batchNo} would go negative (have ${fmtQty(toNum(existing.qty))}, need ${fmtQty(-qtyDelta)})`
      );
    }
    const [updated] = await tx
      .update(inventoryBatches)
      .set({
        qty: fmtQty(newQty),
        dateExpiry: dateExpiry ?? existing.dateExpiry,
        unitCost:
          input.unitCost !== undefined ? fmtQty(input.unitCost) : existing.unitCost,
        updatedAt: new Date(),
        updatedBy: input.userId,
      })
      .where(eq(inventoryBatches.id, existing.id))
      .returning();
    return {
      id: updated.id,
      batchNo: updated.batchNo,
      dateExpiry: updated.dateExpiry,
      qty: toNum(updated.qty),
    };
  }

  if (qtyDelta < 0) {
    throw new Error(`Batch ${batchNo} not found at location for negative adjustment`);
  }

  const [inserted] = await tx
    .insert(inventoryBatches)
    .values({
      productId,
      locationId,
      batchNo,
      dateExpiry,
      qty: fmtQty(qtyDelta),
      unitCost: fmtQty(input.unitCost ?? 0),
      sourceType: input.sourceType ?? null,
      sourceItemId: input.sourceItemId ?? null,
      createdBy: input.userId,
    })
    .returning();

  return {
    id: inserted.id,
    batchNo: inserted.batchNo,
    dateExpiry: inserted.dateExpiry,
    qty: toNum(inserted.qty),
  };
}

/** FEFO: earliest expiry first; null expiry last; then id. Consumes qty; returns takes. */
export async function consumeFefo(
  tx: Tx,
  input: {
    productId: number;
    locationId: number;
    need: number;
    preferredBatchId?: number | null;
  }
): Promise<BatchTake[]> {
  const { productId, locationId, need, preferredBatchId } = input;
  if (need <= 0) return [];

  const baseWhere = and(
    eq(inventoryBatches.productId, productId),
    eq(inventoryBatches.locationId, locationId),
    eq(inventoryBatches.status, "Active")
  );

  const candidates = preferredBatchId
    ? await tx
        .select()
        .from(inventoryBatches)
        .where(and(baseWhere, eq(inventoryBatches.id, preferredBatchId)))
    : await tx
        .select()
        .from(inventoryBatches)
        .where(and(baseWhere, sql`${inventoryBatches.qty} > 0`))
        .orderBy(
          sql`${inventoryBatches.dateExpiry} ASC NULLS LAST`,
          asc(inventoryBatches.id)
        );

  const open = candidates.filter((c) => toNum(c.qty) > 0);
  const total = open.reduce((s, c) => s + toNum(c.qty), 0);
  if (total < need) {
    throw new Error(
      `Insufficient FEFO stock for product ${productId} at location ${locationId}. Available: ${fmtQty(total)}, need: ${fmtQty(need)}`
    );
  }

  const takes: BatchTake[] = [];
  let remaining = need;

  for (const batch of open) {
    if (remaining <= 0) break;
    const have = toNum(batch.qty);
    const take = Math.min(have, remaining);
    const newQty = have - take;

    await tx
      .update(inventoryBatches)
      .set({ qty: fmtQty(newQty), updatedAt: new Date() })
      .where(eq(inventoryBatches.id, batch.id));

    takes.push({
      batchId: batch.id,
      batchNo: batch.batchNo,
      dateExpiry: batch.dateExpiry,
      qty: take,
    });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new Error(`FEFO allocation incomplete; remaining ${fmtQty(remaining)}`);
  }

  return takes;
}

export async function previewFefo(
  tx: Tx,
  input: { productId: number; locationId: number; qty: number }
): Promise<BatchTake[]> {
  const rows = await tx
    .select()
    .from(inventoryBatches)
    .where(
      and(
        eq(inventoryBatches.productId, input.productId),
        eq(inventoryBatches.locationId, input.locationId),
        eq(inventoryBatches.status, "Active"),
        or(sql`${inventoryBatches.qty} > 0`, isNull(inventoryBatches.qty))
      )
    )
    .orderBy(
      sql`${inventoryBatches.dateExpiry} ASC NULLS LAST`,
      asc(inventoryBatches.id)
    );

  const takes: BatchTake[] = [];
  let remaining = input.qty;
  for (const batch of rows) {
    if (remaining <= 0) break;
    const have = toNum(batch.qty);
    if (have <= 0) continue;
    const take = Math.min(have, remaining);
    takes.push({
      batchId: batch.id,
      batchNo: batch.batchNo,
      dateExpiry: batch.dateExpiry,
      qty: take,
    });
    remaining -= take;
  }
  return takes;
}
