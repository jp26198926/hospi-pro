import { z } from "zod";

export const roleSchema = z.object({
  role: z.string().min(1, "Role name is required").max(100),
});

export const roleUpdateSchema = z.object({
  role: z.string().min(1, "Role name is required").max(100),
  status: z.enum(["Active", "Deleted"]).optional(),
});

export type RoleInput = z.infer<typeof roleSchema>;
export type RoleUpdateInput = z.infer<typeof roleUpdateSchema>;
