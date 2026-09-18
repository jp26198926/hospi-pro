import { z } from "zod";

export const paymentMethodSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().min(1, "Description is required").max(255),
});

export const paymentMethodUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().min(1, "Description is required").max(255),
  status: z.enum(["Active", "Deleted"]).optional(),
});

export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;
export type PaymentMethodUpdateInput = z.infer<typeof paymentMethodUpdateSchema>;
