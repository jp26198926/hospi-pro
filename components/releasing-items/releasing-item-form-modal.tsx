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
import type { ReleasingItem } from "./releasing-items-columns";

interface SelectOption {
  value: string;
  label: string;
}

interface BatchOption {
  id: number;
  batchNo: string;
  dateExpiry: Date | string | null;
  qty: string | number;
}

interface FefoAllocation {
  batchId: number;
  batchNo: string;
  dateExpiry: Date | string | null;
  qty: string;
}

interface FefoPreview {
  allocations: FefoAllocation[];
  shortage: string;
  allocatedQty: string;
  requestedQty: string;
}

const AUTO_FEFO = "all";

interface ReleasingItemFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  releasingId: number;
  locationId: number | null;
  item: ReleasingItem | null;
  onSuccess: () => void;
}

export function ReleasingItemFormModal({
  open,
  onOpenChange,
  mode,
  releasingId,
  locationId,
  item,
  onSuccess,
}: ReleasingItemFormModalProps) {
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("0");
  const [batchId, setBatchId] = useState(AUTO_FEFO);
  const [dateExpiry, setDateExpiry] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [productOptions, setProductOptions] = useState<SelectOption[]>([]);
  const [batchOptions, setBatchOptions] = useState<SelectOption[]>([]);
  const [fefoPreview, setFefoPreview] = useState<FefoPreview | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      if (mode === "edit" && item) {
        setProductId(String(item.productId));
        setQty(String(Number(item.qty)));
        setBatchId(item.batchId != null ? String(item.batchId) : AUTO_FEFO);
        setDateExpiry(
          item.dateExpiry ? formatDateOnly(item.dateExpiry, "UTC") : ""
        );
        setRemarks(item.remarks || "");
      } else {
        setProductId("");
        setQty("0");
        setBatchId(AUTO_FEFO);
        setDateExpiry("");
        setRemarks("");
      }
      setFefoPreview(null);
      setBatchOptions([]);
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

  // Load batch options for selected product + from-location
  useEffect(() => {
    if (!open || !productId || !locationId) {
      setBatchOptions([]);
      return;
    }
    let cancelled = false;
    async function loadBatches() {
      try {
        const res = await fetch(
          `/api/inventory-batches?productId=${productId}&locationId=${locationId}`
        );
        const json = await res.json();
        if (!res.ok || cancelled) return;
        const rows: BatchOption[] = json.data || [];
        const options: SelectOption[] = rows.map((b) => {
          const expiry = b.dateExpiry
            ? formatDateOnly(b.dateExpiry, "UTC")
            : "no expiry";
          return {
            value: String(b.id),
            label: `${b.batchNo} · ${expiry} · ${Number(b.qty).toFixed(4)}`,
          };
        });
        // Keep currently selected batch visible even if qty is now 0
        if (
          item?.batchId != null &&
          batchId === String(item.batchId) &&
          !options.some((o) => o.value === String(item.batchId)) &&
          item.batchNo
        ) {
          options.unshift({
            value: String(item.batchId),
            label: `${item.batchNo} (current)`,
          });
        }
        setBatchOptions(options);
      } catch {
        // ignore
      }
    }
    loadBatches();
    return () => {
      cancelled = true;
    };
  }, [open, productId, locationId, item?.batchId, item?.batchNo, batchId]);

  // FEFO preview when productId + qty set
  useEffect(() => {
    if (!open || !productId || !locationId) {
      setFefoPreview(null);
      return;
    }
    const qtyNum = Number(qty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setFefoPreview(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/releasings/preview-fefo?productId=${productId}&locationId=${locationId}&qty=${qtyNum}`
        );
        const json = await res.json();
        if (!res.ok || cancelled) return;
        setFefoPreview({
          allocations: json.allocations || [],
          shortage: json.shortage || "0.0000",
          allocatedQty: json.allocatedQty || "0.0000",
          requestedQty: json.requestedQty || qtyNum.toFixed(4),
        });
      } catch {
        if (!cancelled) setFefoPreview(null);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, productId, locationId, qty]);

  const isAutoFefo = !batchId || batchId === AUTO_FEFO;

  const onSubmit = async () => {
    if (!productId) {
      toast.error("Product is required");
      return;
    }
    setSaving(true);
    try {
      const url =
        mode === "edit" && item
          ? `/api/releasing-items/${item.id}`
          : "/api/releasing-items";
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releasingId,
          productId: Number(productId),
          qty: Number(qty) || 0,
          batchId: isAutoFefo ? null : Number(batchId),
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
            <Label className="text-sm font-medium text-[#333]">Batch</Label>
            <SearchableSelect
              options={batchOptions}
              value={isAutoFefo ? AUTO_FEFO : batchId}
              onValueChange={setBatchId}
              placeholder="Auto (FEFO)"
              allOption
              allLabel="Auto (FEFO)"
            />
            {!locationId && (
              <p className="text-xs text-muted-foreground">
                From-location required to load batches.
              </p>
            )}
          </div>
          {fefoPreview && (
            <div className="space-y-1 rounded-sm border border-[#eee] bg-[#fafafa] p-2 text-xs text-muted-foreground">
              {Number(fefoPreview.shortage) > 0 ? (
                <p className="text-[#d9534f]">
                  Insufficient FEFO stock. Shortage: {fefoPreview.shortage}
                </p>
              ) : fefoPreview.allocations.length === 0 ? (
                <p>No batch stock at this location for the selected product.</p>
              ) : (
                <>
                  <p>
                    {isAutoFefo
                      ? "FEFO allocation:"
                      : "Stock at location (FEFO order):"}
                  </p>
                  <ul className="list-disc space-y-0.5 pl-4">
                    {fefoPreview.allocations.map((a) => (
                      <li key={a.batchId}>
                        {a.batchNo}
                        {a.dateExpiry
                          ? ` · exp ${formatDateOnly(a.dateExpiry, "UTC")}`
                          : ""}
                        {" · "}
                        {a.qty}
                      </li>
                    ))}
                  </ul>
                  {!isAutoFefo && (
                    <p>
                      Selected batch will be used (not auto FEFO allocation).
                    </p>
                  )}
                </>
              )}
            </div>
          )}
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
