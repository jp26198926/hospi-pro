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
import type { ReceivingItem } from "./receiving-items-columns";

interface SelectOption {
  value: string;
  label: string;
}

interface ReceivingItemFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  receivingId: number;
  item: ReceivingItem | null;
  onSuccess: () => void;
}

export function ReceivingItemFormModal({
  open,
  onOpenChange,
  mode,
  receivingId,
  item,
  onSuccess,
}: ReceivingItemFormModalProps) {
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("0");
  const [unitCost, setUnitCost] = useState("0");
  const [batchNo, setBatchNo] = useState("");
  const [dateExpiry, setDateExpiry] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [productOptions, setProductOptions] = useState<SelectOption[]>([]);
  const [prevOpen, setPrevOpen] = useState(open);

  const total = (Number(qty) || 0) * (Number(unitCost) || 0);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      if (mode === "edit" && item) {
        setProductId(String(item.productId));
        setQty(String(Number(item.qty)));
        setUnitCost(String(Number(item.unitCost)));
        setBatchNo(item.batchNo || "");
        setDateExpiry(
          item.dateExpiry ? formatDateOnly(item.dateExpiry, "UTC") : ""
        );
        setRemarks(item.remarks || "");
      } else {
        setProductId("");
        setQty("0");
        setUnitCost("0");
        setBatchNo("");
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
          ? `/api/receiving-items/${item.id}`
          : "/api/receiving-items";
      const method = mode === "edit" ? "PUT" : "POST";
      const payload = {
        receivingId,
        productId: Number(productId),
        qty: Number(qty) || 0,
        unitCost: Number(unitCost) || 0,
        batchNo: batchNo.trim() || null,
        dateExpiry: dateExpiry || null,
        remarks: remarks.trim() || null,
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
      <DialogContent showCloseButton={false} className="flex max-h-[90vh] flex-col rounded-sm border-[#ddd] p-0 sm:max-w-md">
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
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
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
          <div className="grid grid-cols-2 gap-4">
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
              <Label className="text-sm font-medium text-[#333]">Unit Cost</Label>
              <Input
                type="number"
                min={0}
                step="0.0001"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Total Cost</Label>
            <Input value={total.toFixed(4)} readOnly className="bg-[#f8f8f8]" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Batch No</Label>
            <Input
              value={batchNo}
              onChange={(e) => setBatchNo(e.target.value)}
              placeholder="Optional"
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Expiry</Label>
            <DatePicker
              id="item-expiry"
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
