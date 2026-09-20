import { z } from "zod";

export const transferSchema = z.object({
  date: z.coerce.date(),
  fromLocationId: z.number().int().positive("From location is required"),
  toLocationId: z.number().int().positive("To location is required"),
  remarks: z.string().max(1000).optional().nullable(),
});

export type TransferInput = z.infer<typeof transferSchema>;
