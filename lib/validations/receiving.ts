import { z } from "zod";

export const receivingSchema = z.object({
  date: z.coerce.date(),
  supplierId: z.number().int().positive("Supplier is required"),
  locationId: z.number().int().positive("Location is required"),
  poNumber: z.string().trim().max(50).optional().nullable(),
  invoiceNumber: z.string().trim().max(50).optional().nullable(),
  remarks: z.string().max(1000).optional().nullable(),
});

export type ReceivingInput = z.infer<typeof receivingSchema>;
