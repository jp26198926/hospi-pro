import { z } from "zod";

export const gstTypeSchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required").max(100),
});

export const gstTypeUpdateSchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required").max(100),
  status: z.enum(["Active", "Deleted"]).optional(),
});

export type GstTypeInput = z.infer<typeof gstTypeSchema>;
export type GstTypeUpdateInput = z.infer<typeof gstTypeUpdateSchema>;
