import { z } from "zod";

export const locationSchema = z.object({
  name: z.string().min(1, "Location name is required").max(100),
});

export const locationUpdateSchema = z.object({
  name: z.string().min(1, "Location name is required").max(100),
  status: z.enum(["Active", "Deleted"]).optional(),
});

export type LocationInput = z.infer<typeof locationSchema>;
export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;
