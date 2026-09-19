import { z } from "zod";

export const releasingItemSchema = z.object({
  productId: z.number().int().positive("Product is required"),
  qty: z.coerce.number().min(0.0001, "Qty must be greater than 0"),
  dateExpiry: z.coerce.date().optional().nullable(),
  remarks: z.string().max(1000).optional().nullable(),
});

export type ReleasingItemInput = z.infer<typeof releasingItemSchema>;

export function formatReleasingNo(id: number): string {
  return `RLS-${String(id).padStart(5, "0")}`;
}

export function formatReleasingItemNo(id: number): string {
  return `RI-${String(id).padStart(6, "0")}`;
}
