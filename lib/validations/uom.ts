import { z } from "zod";

export const uomSchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required").max(100),
});

export const uomUpdateSchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required").max(100),
  status: z.enum(["Active", "Deleted"]).optional(),
});

export type UomInput = z.infer<typeof uomSchema>;
export type UomUpdateInput = z.infer<typeof uomUpdateSchema>;
