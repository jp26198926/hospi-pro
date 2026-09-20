import { z } from "zod";

export const transferItemSchema = z.object({
  productId: z.number().int().positive("Product is required"),
  qty: z.coerce.number().min(0.0001, "Qty must be greater than 0"),
  dateExpiry: z.coerce.date().optional().nullable(),
  remarks: z.string().max(1000).optional().nullable(),
});

export type TransferItemInput = z.infer<typeof transferItemSchema>;

export function formatTransferNo(id: number): string {
  return `TRAN-${String(id).padStart(5, "0")}`;
}

export function formatTransferItemNo(id: number): string {
  return `TI-${String(id).padStart(6, "0")}`;
}
