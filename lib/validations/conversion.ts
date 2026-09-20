import { z } from "zod";

export const conversionSchema = z.object({
  date: z.coerce.date(),
  locationId: z.number().int().positive("Location is required"),
  fromProductId: z.number().int().positive("From product is required"),
  fromQty: z.number().min(0.0001, "From qty must be greater than 0"),
  toProductId: z.number().int().positive("To product is required"),
  newQty: z.number().min(0.0001, "New qty must be greater than 0"),
  remarks: z.string().max(1000).optional().nullable(),
});

export type ConversionInput = z.infer<typeof conversionSchema>;

export function formatConversionNo(id: number): string {
  return `CNV-${String(id).padStart(5, "0")}`;
}
