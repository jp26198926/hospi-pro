import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  type: z.enum(["inventoriable", "consumable"], {
    required_error: "Category type is required",
  }),
  description: z.string().max(500).optional().nullable(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  type: z.enum(["inventoriable", "consumable"], {
    required_error: "Category type is required",
  }),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(["Active", "Deleted"]).optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
