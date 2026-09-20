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
import { paymentTermSchema, PaymentTermInput } from "@/lib/validations/payment-term";
import type { PaymentTerm } from "./payment-terms-columns";

interface PaymentTermFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  paymentTerm: PaymentTerm | null;
  onSuccess: () => void;
}

export function PaymentTermFormModal({
  open,
  onOpenChange,
  mode,
  paymentTerm,
  onSuccess,
}: PaymentTermFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentTermInput>({
    resolver: zodResolver(paymentTermSchema),
    defaultValues: { name: "", termDays: 0 },
  });

  useEffect(() => {
    if (open) {
      if (mode === "edit" && paymentTerm) {
        reset({ name: paymentTerm.name, termDays: paymentTerm.termDays });
      } else {
        reset({ name: "", termDays: 0 });
      }
    }
  }, [open, mode, paymentTerm, reset]);

  const onSubmit = async (data: PaymentTermInput) => {
    try {
      const url =
        mode === "edit" && paymentTerm
          ? `/api/payment-terms/${paymentTerm.id}`
          : "/api/payment-terms";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          termDays: Number(data.termDays) || 0,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Something went wrong");
        return;
      }

      toast.success(
        mode === "edit"
          ? "Payment term updated successfully"
          : "Payment term created successfully"
      );
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="flex max-h-[90vh] flex-col rounded-sm border-[#ddd] p-0 sm:max-w-md">
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#337ab7] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">
            {mode === "edit" ? "Edit Payment Term" : "Add New Payment Term"}
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-[#333]">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter payment term name (e.g. Net 30, COD)"
              {...register("name")}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="termDays" className="text-sm font-medium text-[#333]">
              Term Days
            </Label>
            <Input
              id="termDays"
              type="number"
              min={0}
              step={1}
              placeholder="0"
              {...register("termDays", { valueAsNumber: true })}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
            {errors.termDays && (
              <p className="text-sm text-red-500">{errors.termDays.message}</p>
            )}
            <p className="text-xs text-muted-foreground">0 = due immediately</p>
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
