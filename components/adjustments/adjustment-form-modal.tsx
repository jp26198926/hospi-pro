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

interface SelectOption {
  value: string;
  label: string;
}

interface AdjustmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function fmtQty(v: number) {
  return Number(v).toFixed(4);
}

export function AdjustmentFormModal({
  open,
  onOpenChange,
  onSuccess,
}: AdjustmentFormModalProps) {
  const [date, setDate] = useState("");
  const [locationId, setLocationId] = useState("");
  const [productId, setProductId] = useState("");
  const [qtyOld, setQtyOld] = useState<number | null>(null);
  const [uomName, setUomName] = useState<string | null>(null);
  const [qtyAdj, setQtyAdj] = useState("0");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [productOptions, setProductOptions] = useState<SelectOption[]>([]);
  const [prevOpen, setPrevOpen] = useState(open);

  const qtyNew =
    qtyOld !== null ? qtyOld + (Number(qtyAdj) || 0) : null;

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDate(formatDateOnly(new Date(), "UTC"));
      setLocationId("");
      setProductId("");
      setQtyOld(null);
      setUomName(null);
      setQtyAdj("0");
      setRemarks("");
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function loadLookups() {
      try {
        const [locRes, prodRes] = await Promise.all([
          fetch("/api/locations?limit=100&status=Active&sortBy=name&sortOrder=asc"),
          fetch("/api/products?limit=100&status=Active&sortBy=code&sortOrder=asc"),
        ]);
        if (cancelled) return;
        if (locRes.ok) {
          const json = await locRes.json();
          setLocationOptions(
            (json.data || []).map((r: { id: number; name: string }) => ({
              value: String(r.id),
              label: r.name,
            }))
          );
        }
        if (prodRes.ok) {
          const json = await prodRes.json();
          setProductOptions(
            (json.data || []).map(
              (r: { id: number; code: string; name: string }) => ({
                value: String(r.id),
                label: `${r.code} — ${r.name}`,
              })
            )
          );
        }
      } catch {
        // ignore
      }
    }
    loadLookups();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !locationId || !productId) {
      return;
    }
    let cancelled = false;
    async function preview() {
      try {
        const res = await fetch(
          `/api/adjustments/preview?productId=${productId}&locationId=${locationId}`
        );
        const json = await res.json();
        if (!res.ok || cancelled) return;
        setQtyOld(Number(json.data?.qtyOld) || 0);
        setUomName(json.data?.uomName ?? null);
      } catch {
        if (!cancelled) setQtyOld(0);
      }
    }
    preview();
    return () => {
      cancelled = true;
    };
  }, [open, locationId, productId]);

  const onSubmit = async () => {
    if (!date || !locationId || !productId) {
      toast.error("Date, location, and product are required");
      return;
    }
    const adj = Number(qtyAdj);
    if (!Number.isFinite(adj) || adj === 0) {
      toast.error("Qty adjust cannot be zero");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          locationId: Number(locationId),
          productId: Number(productId),
          qtyAdj: adj,
          remarks: remarks.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Something went wrong");
        return;
      }
      toast.success(
        `Adjustment ${json.data?.transNo || ""} saved — stock updated`
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
      <DialogContent showCloseButton={false} className="flex max-h-[90vh] flex-col rounded-sm border-[#ddd] p-0 sm:max-w-lg">
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#337ab7] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">
            Add New Adjustment
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
              Date <span className="text-red-500">*</span>
            </Label>
            <DatePicker
              id="adjustment-date"
              value={date}
              onValueChange={setDate}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">
                Location <span className="text-red-500">*</span>
              </Label>
              <SearchableSelect
                options={locationOptions}
                value={locationId}
                onValueChange={(v) => {
                  setLocationId(v);
                  setQtyOld(null);
                  setUomName(null);
                }}
                placeholder="Select location"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">
                Product <span className="text-red-500">*</span>
              </Label>
              <SearchableSelect
                options={productOptions}
                value={productId}
                onValueChange={(v) => {
                  setProductId(v);
                  setQtyOld(null);
                  setUomName(null);
                }}
                placeholder="Select product"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">UOM</Label>
              <Input
                readOnly
                value={uomName || "-"}
                className="bg-[#f8f8f8] border-[#ccc]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">Old Qty</Label>
              <Input
                readOnly
                value={qtyOld !== null ? fmtQty(qtyOld) : "-"}
                className="bg-[#f8f8f8] border-[#ccc]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">
                Adj Qty <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                step="0.0001"
                value={qtyAdj}
                onChange={(e) => setQtyAdj(e.target.value)}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
              <p className="text-xs text-muted-foreground">
                + or − (not zero)
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">New Qty</Label>
              <Input
                readOnly
                value={qtyNew !== null ? fmtQty(qtyNew) : "-"}
                className="bg-[#f8f8f8] border-[#ccc]"
              />
            </div>
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
            className="border-[#ccc]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="bg-[#5cb85c] text-white hover:bg-[#449d44]"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Adjustment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
