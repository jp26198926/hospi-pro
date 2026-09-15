import { z } from "zod";

export const pageSchema = z.object({
  page: z.string().min(1, "Page name is required").max(100),
  path: z.string().min(1, "Path is required").max(255),
  icon: z.string().max(100).optional().nullable(),
  parentId: z.number().int().positive().optional().nullable(),
  order: z.number().int().optional().nullable(),
});

export const pageUpdateSchema = z.object({
  page: z.string().min(1, "Page name is required").max(100),
  path: z.string().min(1, "Path is required").max(255),
  icon: z.string().max(100).optional().nullable(),
  parentId: z.number().int().positive().optional().nullable(),
  order: z.number().int().optional().nullable(),
  status: z.enum(["Active", "Deleted"]).optional(),
});

export type PageInput = z.infer<typeof pageSchema>;
export type PageUpdateInput = z.infer<typeof pageUpdateSchema>;
