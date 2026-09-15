"use client";

import { useEffect } from "react";
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
import { Loader2, X } from "lucide-react";
import { roleSchema, RoleInput } from "@/lib/validations/role";
import type { Role } from "./roles-columns";

interface RoleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  role: Role | null;
  onSuccess: () => void;
}

export function RoleFormModal({
  open,
  onOpenChange,
  mode,
  role,
  onSuccess,
}: RoleFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoleInput>({
    resolver: zodResolver(roleSchema),
  });

  useEffect(() => {
    if (open) {
      if (mode === "edit" && role) {
        reset({ role: role.role });
      } else {
        reset({ role: "" });
      }
    }
  }, [open, mode, role, reset]);

  const onSubmit = async (data: RoleInput) => {
    try {
      const url = mode === "edit" && role ? `/api/roles/${role.id}` : "/api/roles";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Something went wrong");
        return;
      }

      toast.success(mode === "edit" ? "Role updated successfully" : "Role created successfully");
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-sm border-[#ddd] p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#337ab7] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">
            {mode === "edit" ? "Edit Role" : "Add New Role"}
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm font-medium text-[#333]">
              Role Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="role"
              placeholder="Enter role name"
              {...register("role")}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
            {errors.role && (
              <p className="text-sm text-red-500">{errors.role.message}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-[#eee] pt-4">
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
