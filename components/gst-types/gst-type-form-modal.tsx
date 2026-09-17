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
import { gstTypeSchema, GstTypeInput } from "@/lib/validations/gst-type";
import type { GstType } from "./gst-types-columns";

interface GstTypeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  gstType: GstType | null;
  onSuccess: () => void;
}

export function GstTypeFormModal({
  open,
  onOpenChange,
  mode,
  gstType,
  onSuccess,
}: GstTypeFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GstTypeInput>({
    resolver: zodResolver(gstTypeSchema),
  });

  useEffect(() => {
    if (open) {
      if (mode === "edit" && gstType) {
        reset({ code: gstType.code, name: gstType.name });
      } else {
        reset({ code: "", name: "" });
      }
    }
  }, [open, mode, gstType, reset]);

  const onSubmit = async (data: GstTypeInput) => {
    try {
      const url = mode === "edit" && gstType ? `/api/gst-types/${gstType.id}` : "/api/gst-types";
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

      toast.success(mode === "edit" ? "GST type updated successfully" : "GST type created successfully");
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
            {mode === "edit" ? "Edit GST Type" : "Add New GST Type"}
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
            <Label htmlFor="code" className="text-sm font-medium text-[#333]">
              Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="code"
              placeholder="Enter GST type code (e.g. GST10, GST0, EXEMPT)"
              {...register("code")}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
            {errors.code && (
              <p className="text-sm text-red-500">{errors.code.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-[#333]">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter GST type name (e.g. Standard Rate, Zero Rated, Exempt)"
              {...register("name")}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
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
