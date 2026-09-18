import { z } from "zod";

export const transTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

export const transTypeUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  status: z.enum(["Active", "Deleted"]).optional(),
});

export type TransTypeInput = z.infer<typeof transTypeSchema>;
export type TransTypeUpdateInput = z.infer<typeof transTypeUpdateSchema>;
