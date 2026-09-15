import { z } from "zod";

export const rolePermissionSchema = z.object({
  roleId: z.number().int().positive("Role is required"),
  pageId: z.number().int().positive("Page is required"),
  permissionId: z.number().int().positive("Permission is required"),
});

export type RolePermissionInput = z.infer<typeof rolePermissionSchema>;
