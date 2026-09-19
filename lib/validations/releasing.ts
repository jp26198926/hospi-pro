import { z } from "zod";

export const releasingSchema = z.object({
  date: z.coerce.date(),
  fromLocationId: z.number().int().positive("From location is required"),
  toLocationId: z.number().int().positive().optional().nullable(),
  receiverName: z.string().trim().min(1, "Receiver is required").max(150),
  remarks: z.string().max(1000).optional().nullable(),
});

export type ReleasingInput = z.infer<typeof releasingSchema>;
