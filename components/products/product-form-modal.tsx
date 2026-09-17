"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { productSchema, ProductInput } from "@/lib/validations/product";
import type { Product } from "./products-columns";

interface CategoryOption {
  id: number;
  name: string;
}

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  product: Product | null;
  onSuccess: () => void;
}

export function ProductFormModal({
  open,
  onOpenChange,
  mode,
  product,
  onSuccess,
}: ProductFormModalProps) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
  });

  useEffect(() => {
    if (open) {
      fetch("/api/categories?status=Active&limit=100")
        .then((r) => r.json())
        .then((json) => {
          if (json.data) setCategories(json.data);
        })
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (mode === "edit" && product) {
        reset({
          name: product.name,
          categoryId: product.categoryId,
          brand: product.brand || "",
          model: product.model || "",
          minStock: Number(product.minStock),
          stock: Number(product.stock),
          lastCost: Number(product.lastCost),
          avgCost: Number(product.avgCost),
        });
      } else {
        reset({
          name: "",
          categoryId: null,
          brand: "",
          model: "",
          minStock: 0,
          stock: 0,
          lastCost: 0,
          avgCost: 0,
        });
      }
    }
  }, [open, mode, product, reset]);

  const categoryOptions = categories.map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  const onSubmit = async (data: ProductInput) => {
    try {
      const url = mode === "edit" && product ? `/api/products/${product.id}` : "/api/products";
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

      toast.success(mode === "edit" ? "Product updated successfully" : "Product created successfully");
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg rounded-sm border-[#ddd] p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#337ab7] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">
            {mode === "edit" ? "Edit Product" : "Add New Product"}
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
            <Label htmlFor="name" className="text-sm font-medium text-[#333]">
              Product Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter product name"
              {...register("name")}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">
              Category
            </Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <SearchableSelect
                  options={categoryOptions}
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(val) => field.onChange(val ? parseInt(val) : null)}
                  placeholder="Select category"
                  allOption
                  allLabel="None"
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brand" className="text-sm font-medium text-[#333]">
                Brand
              </Label>
              <Input
                id="brand"
                placeholder="Enter brand"
                {...register("brand")}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model" className="text-sm font-medium text-[#333]">
                Model
              </Label>
              <Input
                id="model"
                placeholder="Enter model"
                {...register("model")}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="minStock" className="text-sm font-medium text-[#333]">
                Min Stock
              </Label>
              <Input
                id="minStock"
                type="number"
                step="0.0001"
                min="0"
                {...register("minStock", { valueAsNumber: true })}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock" className="text-sm font-medium text-[#333]">
                Stock
              </Label>
              <Input
                id="stock"
                type="number"
                step="0.0001"
                min="0"
                {...register("stock", { valueAsNumber: true })}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastCost" className="text-sm font-medium text-[#333]">
                Last Cost
              </Label>
              <Input
                id="lastCost"
                type="number"
                step="0.0001"
                min="0"
                {...register("lastCost", { valueAsNumber: true })}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avgCost" className="text-sm font-medium text-[#333]">
                Avg Cost
              </Label>
              <Input
                id="avgCost"
                type="number"
                step="0.0001"
                min="0"
                {...register("avgCost", { valueAsNumber: true })}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
            </div>
          </div>

          {mode === "add" && (
            <p className="text-xs text-muted-foreground">
              Product code will be auto-generated (e.g. P000001).
            </p>
          )}

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
