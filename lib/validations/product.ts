import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(150),
  categoryId: z.number().int().positive().optional().nullable(),
  brand: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  minStock: z.number().min(0).optional(),
  stock: z.number().min(0).optional(),
  lastCost: z.number().min(0).optional(),
  avgCost: z.number().min(0).optional(),
});

export const productUpdateSchema = z.object({
  name: z.string().min(1, "Product name is required").max(150),
  categoryId: z.number().int().positive().optional().nullable(),
  brand: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  minStock: z.number().min(0).optional(),
  stock: z.number().min(0).optional(),
  lastCost: z.number().min(0).optional(),
  avgCost: z.number().min(0).optional(),
  status: z.enum(["Active", "Deleted"]).optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
