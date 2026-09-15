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
import { permissionSchema, PermissionInput } from "@/lib/validations/permission";
import type { Permission } from "./permissions-columns";

interface PermissionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  permission: Permission | null;
  onSuccess: () => void;
}

export function PermissionFormModal({
  open,
  onOpenChange,
  mode,
  permission,
  onSuccess,
}: PermissionFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PermissionInput>({
    resolver: zodResolver(permissionSchema),
  });

  useEffect(() => {
    if (open) {
      if (mode === "edit" && permission) {
        reset({ permission: permission.permission });
      } else {
        reset({ permission: "" });
      }
    }
  }, [open, mode, permission, reset]);

  const onSubmit = async (data: PermissionInput) => {
    try {
      const url = mode === "edit" && permission ? `/api/permissions/${permission.id}` : "/api/permissions";
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

      toast.success(mode === "edit" ? "Permission updated successfully" : "Permission created successfully");
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
            {mode === "edit" ? "Edit Permission" : "Add New Permission"}
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
            <Label htmlFor="permission" className="text-sm font-medium text-[#333]">
              Permission Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="permission"
              placeholder="Enter permission name"
              {...register("permission")}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
            {errors.permission && (
              <p className="text-sm text-red-500">{errors.permission.message}</p>
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
