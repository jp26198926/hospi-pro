import { z } from "zod";

export const paymentTermSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  termDays: z.coerce
    .number()
    .int("Term days must be a whole number")
    .min(0, "Term days must be 0 or greater"),
});

export const paymentTermUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  termDays: z.coerce
    .number()
    .int("Term days must be a whole number")
    .min(0, "Term days must be 0 or greater"),
  status: z.enum(["Active", "Deleted"]).optional(),
});

export type PaymentTermInput = z.infer<typeof paymentTermSchema>;
export type PaymentTermUpdateInput = z.infer<typeof paymentTermUpdateSchema>;
