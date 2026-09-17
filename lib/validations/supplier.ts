import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(150),
  contactPerson: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email("Invalid email address").max(150).optional().nullable().or(z.literal("")),
});

export const supplierUpdateSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(150),
  contactPerson: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email("Invalid email address").max(150).optional().nullable().or(z.literal("")),
  status: z.enum(["Active", "Deleted"]).optional(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
export type SupplierUpdateInput = z.infer<typeof supplierUpdateSchema>;
