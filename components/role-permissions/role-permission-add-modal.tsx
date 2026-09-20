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
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Loader2, X } from "lucide-react";
import { rolePermissionSchema, RolePermissionInput } from "@/lib/validations/role-permission";

interface PageOption {
  id: number;
  page: string;
  parentId: number | null;
}

interface PermissionOption {
  id: number;
  permission: string;
}

interface RolePermissionAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleId: number;
  onSuccess: () => void;
}

export function RolePermissionAddModal({
  open,
  onOpenChange,
  roleId,
  onSuccess,
}: RolePermissionAddModalProps) {
  const [pages, setPages] = useState<PageOption[]>([]);
  const [perms, setPerms] = useState<PermissionOption[]>([]);

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RolePermissionInput>({
    resolver: zodResolver(rolePermissionSchema),
    defaultValues: {
      roleId,
      pageId: 0,
      permissionId: 0,
    },
  });

  const pageIdValue = watch("pageId");
  const permissionIdValue = watch("permissionId");

  useEffect(() => {
    if (open) {
      reset({ roleId, pageId: 0, permissionId: 0 });
      Promise.all([
        fetch("/api/pages?status=Active&limit=100").then((r) => r.json()),
        fetch("/api/permissions?status=Active&limit=100").then((r) => r.json()),
      ]).then(([pagesJson, permsJson]) => {
        if (pagesJson.data) setPages(pagesJson.data);
        if (permsJson.data) setPerms(permsJson.data);
      }).catch(() => {});
    }
  }, [open, roleId, reset]);

  const pageOptions = pages.map((p) => ({
    value: String(p.id),
    label: p.page,
    indent: !!p.parentId,
  }));

  const permissionOptions = perms.map((p) => ({
    value: String(p.id),
    label: p.permission,
  }));

  const onSubmit = async (data: RolePermissionInput) => {
    try {
      const res = await fetch("/api/role-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, roleId }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Something went wrong");
        return;
      }

      toast.success("Role permission added successfully");
      onSuccess();
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="flex max-h-[90vh] flex-col rounded-sm border-[#ddd] p-0 sm:max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#337ab7] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">
            Add Page Permission
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
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">
              Page <span className="text-red-500">*</span>
            </Label>
            <SearchableSelect
              options={pageOptions}
              value={pageIdValue ? String(pageIdValue) : ""}
              onValueChange={(val) => setValue("pageId", val ? Number(val) : 0)}
              placeholder="Select page"
            />
            {errors.pageId && (
              <p className="text-sm text-red-500">{errors.pageId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">
              Permission <span className="text-red-500">*</span>
            </Label>
            <SearchableSelect
              options={permissionOptions}
              value={permissionIdValue ? String(permissionIdValue) : ""}
              onValueChange={(val) => setValue("permissionId", val ? Number(val) : 0)}
              placeholder="Select permission"
            />
            {errors.permissionId && (
              <p className="text-sm text-red-500">{errors.permissionId.message}</p>
            )}
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
              Add
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
