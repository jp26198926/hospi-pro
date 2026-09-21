import { z } from "zod";

export const receivingItemSchema = z.object({
  productId: z.number().int().positive("Product is required"),
  qty: z.coerce.number().min(0, "Qty must be 0 or greater"),
  unitCost: z.coerce.number().min(0, "Unit cost must be 0 or greater"),
  batchNo: z.string().max(100).optional().nullable(),
  dateExpiry: z.coerce.date().optional().nullable(),
  remarks: z.string().max(1000).optional().nullable(),
});

export type ReceivingItemInput = z.infer<typeof receivingItemSchema>;

export function formatReceivingNo(id: number): string {
  return `RCV-${String(id).padStart(5, "0")}`;
}

export function formatBatchNo(id: number): string {
  return `BATCH-${String(id).padStart(6, "0")}`;
}
