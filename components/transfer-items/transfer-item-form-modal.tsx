"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2, X } from "lucide-react";
import { formatDateOnly } from "@/lib/datetime";
import type { TransferItem } from "./transfer-items-columns";

interface SelectOption {
  value: string;
  label: string;
}

interface TransferItemFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  transferId: number;
  item: TransferItem | null;
  onSuccess: () => void;
}

export function TransferItemFormModal({
  open,
  onOpenChange,
  mode,
  transferId,
  item,
  onSuccess,
}: TransferItemFormModalProps) {
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("0");
  const [dateExpiry, setDateExpiry] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [productOptions, setProductOptions] = useState<SelectOption[]>([]);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      if (mode === "edit" && item) {
        setProductId(String(item.productId));
        setQty(String(Number(item.qty)));
        setDateExpiry(item.dateExpiry ? formatDateOnly(item.dateExpiry, "UTC") : "");
        setRemarks(item.remarks || "");
      } else {
        setProductId("");
        setQty("0");
        setDateExpiry("");
        setRemarks("");
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function loadProducts() {
      try {
        const res = await fetch(
          "/api/products?limit=100&status=Active&sortBy=name&sortOrder=asc"
        );
        const json = await res.json();
        if (!res.ok || cancelled) return;
        setProductOptions(
          (json.data || []).map((r: { id: number; code: string; name: string }) => ({
            value: String(r.id),
            label: `${r.code} — ${r.name}`,
          }))
        );
      } catch {
        // ignore
      }
    }
    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const onSubmit = async () => {
    if (!productId) {
      toast.error("Product is required");
      return;
    }
    setSaving(true);
    try {
      const url =
        mode === "edit" && item
          ? `/api/transfer-items/${item.id}`
          : "/api/transfer-items";
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transferId,
          productId: Number(productId),
          qty: Number(qty) || 0,
          dateExpiry: dateExpiry || null,
          remarks: remarks.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Something went wrong");
        return;
      }
      toast.success(
        mode === "edit" ? "Item updated successfully" : "Item added successfully"
      );
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-sm border-[#ddd] p-0">
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#337ab7] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">
            {mode === "edit" ? "Edit Item" : "Add Item"}
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">
              Product <span className="text-red-500">*</span>
            </Label>
            <SearchableSelect
              options={productOptions}
              value={productId}
              onValueChange={setProductId}
              placeholder="Select product"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Qty</Label>
            <Input
              type="number"
              min={0}
              step="0.0001"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Expiry</Label>
            <DatePicker
              id="transfer-item-expiry"
              value={dateExpiry}
              onValueChange={setDateExpiry}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Qty is validated against stock at the from-location.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#eee] bg-[#f8f8f8] px-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#ccc]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="bg-[#337ab7] text-white hover:bg-[#286090]"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "edit" ? "Update" : "Add"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
