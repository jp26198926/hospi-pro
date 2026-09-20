import { z } from "zod";

export const adjustmentSchema = z.object({
  date: z.coerce.date(),
  locationId: z.number().int().positive("Location is required"),
  productId: z.number().int().positive("Product is required"),
  qtyAdj: z
    .number()
    .refine((n) => n !== 0, { message: "Qty adjust cannot be zero" }),
  remarks: z.string().max(1000).optional().nullable(),
});

export type AdjustmentInput = z.infer<typeof adjustmentSchema>;

export function formatAdjustmentNo(id: number): string {
  return `ADJ-${String(id).padStart(5, "0")}`;
}
