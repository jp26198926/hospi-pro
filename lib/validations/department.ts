import { z } from "zod";

export const departmentSchema = z.object({
  department: z.string().min(1, "Department name is required").max(100),
});

export const departmentUpdateSchema = z.object({
  department: z.string().min(1, "Department name is required").max(100),
  status: z.enum(["Active", "Deleted"]).optional(),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;
export type DepartmentUpdateInput = z.infer<typeof departmentUpdateSchema>;
