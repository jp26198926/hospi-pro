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
import { pageSchema, PageInput } from "@/lib/validations/page";
import type { PageRecord } from "./pages-columns";

const ICON_OPTIONS = [
  "home", "settings", "users", "shield", "file-text", "bar-chart-3",
  "calendar", "mail", "bell", "search", "layout-dashboard", "lock",
  "globe", "heart", "star", "bookmark", "tag", "folder", "image",
  "video", "music", "phone", "map-pin", "shopping-cart", "credit-card",
];

interface PageFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  page: PageRecord | null;
  onSuccess: () => void;
}

export function PageFormModal({
  open,
  onOpenChange,
  mode,
  page,
  onSuccess,
}: PageFormModalProps) {
  const [parentPages, setParentPages] = useState<PageRecord[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PageInput>({
    resolver: zodResolver(pageSchema),
    defaultValues: {
      page: "",
      path: "",
      icon: "",
      parentId: null,
      order: null,
    },
  });

  const parentIdValue = watch("parentId");
  const iconValue = watch("icon");

  useEffect(() => {
    if (open) {
      // Fetch active pages for parent dropdown
      fetch("/api/pages?status=Active&limit=100")
        .then((res) => res.json())
        .then((json) => {
          if (json.data) {
            // Exclude current page from parent options (to prevent self-reference)
            const filtered = page
              ? json.data.filter((p: PageRecord) => p.id !== page.id)
              : json.data;
            setParentPages(filtered);
          }
        })
        .catch(() => {});

      if (mode === "edit" && page) {
        reset({
          page: page.page,
          path: page.path,
          icon: page.icon || "",
          parentId: page.parentId,
          order: page.order,
        });
      } else {
        reset({ page: "", path: "", icon: "", parentId: null, order: null });
      }
    }
  }, [open, mode, page, reset]);

  const onSubmit = async (data: PageInput) => {
    try {
      const url = mode === "edit" && page ? `/api/pages/${page.id}` : "/api/pages";
      const method = mode === "edit" ? "PUT" : "POST";

      const payload = {
        ...data,
        icon: data.icon || null,
        parentId: data.parentId || null,
        order: data.order || null,
      };

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

      toast.success(mode === "edit" ? "Page updated successfully" : "Page created successfully");
      onOpenChange(false);
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
            {mode === "edit" ? "Edit Page" : "Add New Page"}
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
            <Label htmlFor="page" className="text-sm font-medium text-[#333]">
              Page Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="page"
              placeholder="Enter page name"
              {...register("page")}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
            {errors.page && (
              <p className="text-sm text-red-500">{errors.page.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="path" className="text-sm font-medium text-[#333]">
              Path <span className="text-red-500">*</span>
            </Label>
            <Input
              id="path"
              placeholder="e.g. /admin/dashboard"
              {...register("path")}
              className="border-[#ccc] font-mono text-sm focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
            {errors.path && (
              <p className="text-sm text-red-500">{errors.path.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">
              Icon
            </Label>
            <SearchableSelect
              options={[{ value: "none", label: "None" }, ...ICON_OPTIONS.map((icon) => ({ value: icon, label: icon }))]}
              value={iconValue || "none"}
              onValueChange={(val) => setValue("icon", val === "none" ? null : val)}
              placeholder="Select icon"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">
              Parent Page
            </Label>
            <SearchableSelect
              options={[{ value: "none", label: "None (Top Level)" }, ...parentPages.map((p) => ({ value: String(p.id), label: p.page, indent: !!p.parentId }))]}
              value={parentIdValue ? String(parentIdValue) : "none"}
              onValueChange={(val) => setValue("parentId", val === "none" ? null : Number(val))}
              placeholder="Select parent page"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="order" className="text-sm font-medium text-[#333]">
              Order
            </Label>
            <Input
              id="order"
              type="number"
              placeholder="Display order (optional)"
              {...register("order", { valueAsNumber: true })}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
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
