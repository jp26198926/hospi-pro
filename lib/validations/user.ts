import { z } from "zod";

export const userCreateSchema = z.object({
  email: z.string().email("Invalid email address").max(100),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  firstname: z.string().min(1, "First name is required").max(100),
  lastname: z.string().min(1, "Last name is required").max(100),
  departmentId: z.number().int().positive().optional().nullable(),
  roleId: z.number().int().positive().optional().nullable(),
});

export const userUpdateSchema = z.object({
  email: z.string().email("Invalid email address").max(100),
  firstname: z.string().min(1, "First name is required").max(100),
  lastname: z.string().min(1, "Last name is required").max(100),
  departmentId: z.number().int().positive().optional().nullable(),
  roleId: z.number().int().positive().optional().nullable(),
});

export const changePasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters").max(100),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
