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
import { paymentMethodSchema, PaymentMethodInput } from "@/lib/validations/payment-method";
import type { PaymentMethod } from "./payment-methods-columns";

interface PaymentMethodFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  paymentMethod: PaymentMethod | null;
  onSuccess: () => void;
}

export function PaymentMethodFormModal({
  open,
  onOpenChange,
  mode,
  paymentMethod,
  onSuccess,
}: PaymentMethodFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentMethodInput>({
    resolver: zodResolver(paymentMethodSchema),
  });

  useEffect(() => {
    if (open) {
      if (mode === "edit" && paymentMethod) {
        reset({ name: paymentMethod.name, description: paymentMethod.description });
      } else {
        reset({ name: "", description: "" });
      }
    }
  }, [open, mode, paymentMethod, reset]);

  const onSubmit = async (data: PaymentMethodInput) => {
    try {
      const url =
        mode === "edit" && paymentMethod
          ? `/api/payment-methods/${paymentMethod.id}`
          : "/api/payment-methods";
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

      toast.success(
        mode === "edit"
          ? "Payment method updated successfully"
          : "Payment method created successfully"
      );
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-sm border-[#ddd] p-0">
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#337ab7] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">
            {mode === "edit" ? "Edit Payment Method" : "Add New Payment Method"}
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-[#333]">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter payment method name (e.g. Cash, Credit Card)"
              {...register("name")}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-[#333]">
              Description <span className="text-red-500">*</span>
            </Label>
            <Input
              id="description"
              placeholder="Enter description"
              {...register("description")}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

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
