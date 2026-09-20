"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Loader2, X } from "lucide-react";
import { userCreateSchema, UserCreateInput } from "@/lib/validations/user";
import type { UserRecord } from "./users-columns";

interface DepartmentOption {
  id: number;
  department: string;
}

interface RoleOption {
  id: number;
  role: string;
}

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  user: UserRecord | null;
  onSuccess: () => void;
}

export function UserFormModal({
  open,
  onOpenChange,
  mode,
  user,
  onSuccess,
}: UserFormModalProps) {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [rolesList, setRolesList] = useState<RoleOption[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserCreateInput>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      email: "",
      password: "",
      firstname: "",
      lastname: "",
      departmentId: null,
      roleId: null,
    },
  });

  const departmentIdValue = watch("departmentId");
  const roleIdValue = watch("roleId");

  useEffect(() => {
    if (open) {
      Promise.all([
        fetch("/api/departments?status=Active&limit=100").then((r) => r.json()),
        fetch("/api/roles?status=Active&limit=100").then((r) => r.json()),
      ]).then(([deptsJson, rolesJson]) => {
        if (deptsJson.data) setDepartments(deptsJson.data);
        if (rolesJson.data) setRolesList(rolesJson.data);
      }).catch(() => {});

      if (mode === "edit" && user) {
        reset({
          email: user.email,
          password: "",
          firstname: user.firstname,
          lastname: user.lastname,
          departmentId: user.departmentId,
          roleId: user.roleId,
        });
      } else {
        reset({ email: "", password: "", firstname: "", lastname: "", departmentId: null, roleId: null });
      }
    }
  }, [open, mode, user, reset]);

  const departmentOptions = departments.map((d) => ({
    value: String(d.id),
    label: d.department,
  }));

  const roleOptions = rolesList.map((r) => ({
    value: String(r.id),
    label: r.role,
  }));

  const onSubmit = async (data: UserCreateInput) => {
    try {
      const url = mode === "edit" && user ? `/api/users/${user.id}` : "/api/users";
      const method = mode === "edit" ? "PUT" : "POST";

      // For edit, only send non-password fields
      const payload = mode === "edit"
        ? { email: data.email, firstname: data.firstname, lastname: data.lastname, departmentId: data.departmentId, roleId: data.roleId }
        : data;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Something went wrong");
        return;
      }

      toast.success(mode === "edit" ? "User updated successfully" : "User created successfully");
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="flex max-h-[90vh] flex-col rounded-sm border-[#ddd] p-0 sm:max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#337ab7] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">
            {mode === "edit" ? "Edit User" : "Add New User"}
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstname" className="text-sm font-medium text-[#333]">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstname"
                placeholder="Enter first name"
                {...register("firstname")}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
              {errors.firstname && (
                <p className="text-sm text-red-500">{errors.firstname.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastname" className="text-sm font-medium text-[#333]">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastname"
                placeholder="Enter last name"
                {...register("lastname")}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
              {errors.lastname && (
                <p className="text-sm text-red-500">{errors.lastname.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-[#333]">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              {...register("email")}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          {mode === "add" && (
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-[#333]">
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password (min 6 characters)"
                {...register("password")}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Department</Label>
            <SearchableSelect
              options={departmentOptions}
              value={departmentIdValue ? String(departmentIdValue) : ""}
              onValueChange={(val) => setValue("departmentId", val ? Number(val) : null)}
              placeholder="Select department"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Role</Label>
            <SearchableSelect
              options={roleOptions}
              value={roleIdValue ? String(roleIdValue) : ""}
              onValueChange={(val) => setValue("roleId", val ? Number(val) : null)}
              placeholder="Select role"
            />
          </div>

          </div>
          <div className="flex justify-end gap-2 border-t border-[#eee] bg-[#f8f8f8] px-4 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#ccc] bg-white text-[#333] hover:bg-[#f5f5f5]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#337ab7] text-white hover:bg-[#286090]"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "edit" ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
