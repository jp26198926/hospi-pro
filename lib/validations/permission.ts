import { z } from "zod";

export const permissionSchema = z.object({
  permission: z.string().min(1, "Permission name is required").max(100),
});

export const permissionUpdateSchema = z.object({
  permission: z.string().min(1, "Permission name is required").max(100),
  status: z.enum(["Active", "Deleted"]).optional(),
});

export type PermissionInput = z.infer<typeof permissionSchema>;
export type PermissionUpdateInput = z.infer<typeof permissionUpdateSchema>;
