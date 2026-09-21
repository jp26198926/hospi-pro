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

interface PharConversionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PharConversionFormModal({
  open,
  onOpenChange,
  onSuccess,
}: PharConversionFormModalProps) {
  const [date, setDate] = useState("");
  const [pharmacyId, setPharmacyId] = useState("");
  const [pharmacyName, setPharmacyName] = useState("Pharmacy");
  const [fromProductId, setFromProductId] = useState("");
  const [fromUomName, setFromUomName] = useState<string | null>(null);
  const [fromQty, setFromQty] = useState("");
  const [toProductId, setToProductId] = useState("");
  const [toUomName, setToUomName] = useState<string | null>(null);
  const [newQty, setNewQty] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [productOptions, setProductOptions] = useState<SelectOption[]>([]);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDate(formatDateOnly(new Date(), "UTC"));
      setFromProductId("");
      setFromUomName(null);
      setFromQty("");
      setToProductId("");
      setToUomName(null);
      setNewQty("");
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
          const phar = (json.data || []).find(
            (r: { id: number; name: string }) =>
              String(r.name || "").toLowerCase() === "pharmacy"
          );
          if (phar) {
            setPharmacyId(String(phar.id));
            setPharmacyName(phar.name);
          } else {
            setPharmacyId("");
            setPharmacyName("Pharmacy");
          }
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
    if (!open || !fromProductId || !toProductId || !pharmacyId) {
      return;
    }
    let cancelled = false;
    async function preview() {
      try {
        // Force pharmacy locationId on preview
        const res = await fetch(
          `/api/conversions/preview?fromProductId=${fromProductId}&toProductId=${toProductId}&locationId=${pharmacyId}`
        );
        const json = await res.json();
        if (!res.ok || cancelled) return;
        setFromUomName(json.data?.fromUomName ?? null);
        setToUomName(json.data?.toUomName ?? null);
      } catch {
        // ignore
      }
    }
    preview();
    return () => {
      cancelled = true;
    };
  }, [open, fromProductId, toProductId, pharmacyId]);

  const onSubmit = async () => {
    if (!date || !fromProductId || !toProductId) {
      toast.error("Date and both products are required");
      return;
    }
    if (!pharmacyId) {
      toast.error("Pharmacy location not found");
      return;
    }
    if (fromProductId === toProductId) {
      toast.error("From product and To product must be different");
      return;
    }
    const fq = Number(fromQty);
    const nq = Number(newQty);
    if (!Number.isFinite(fq) || fq <= 0 || !Number.isFinite(nq) || nq <= 0) {
      toast.error("From qty and New qty must be greater than 0");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/phar-conversions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          locationId: Number(pharmacyId),
          fromProductId: Number(fromProductId),
          fromQty: fq,
          toProductId: Number(toProductId),
          newQty: nq,
          remarks: remarks.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Something went wrong");
        return;
      }
      toast.success(`Conversion ${json.data?.transNo || ""} saved`);
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
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] flex-col rounded-sm border-[#ddd] p-0 sm:max-w-lg"
      >
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#337ab7] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">
            Add New Phar Conversion
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">
                Date <span className="text-red-500">*</span>
              </Label>
              <DatePicker id="phar-conversion-date" value={date} onValueChange={setDate} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">
                Location <span className="text-red-500">*</span>
              </Label>
              <Input
                readOnly
                value={pharmacyName}
                className="bg-[#f8f8f8] border-[#ccc]"
                title="Location is locked to pharmacy"
              />
              <p className="text-xs text-muted-foreground">Locked to pharmacy</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">
                From Product <span className="text-red-500">*</span>
              </Label>
              <SearchableSelect
                options={productOptions}
                value={fromProductId}
                onValueChange={(v) => {
                  setFromProductId(v);
                  setFromUomName(null);
                }}
                placeholder="Select from product"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">From UOM</Label>
              <Input
                readOnly
                value={fromUomName || "-"}
                className="bg-[#f8f8f8] border-[#ccc]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">
                From Qty <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                step="0.0001"
                value={fromQty}
                onChange={(e) => setFromQty(e.target.value)}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">
                To Product <span className="text-red-500">*</span>
              </Label>
              <SearchableSelect
                options={productOptions}
                value={toProductId}
                onValueChange={(v) => {
                  setToProductId(v);
                  setToUomName(null);
                }}
                placeholder="Select to product"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">To UOM</Label>
              <Input
                readOnly
                value={toUomName || "-"}
                className="bg-[#f8f8f8] border-[#ccc]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">
                New Qty <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                step="0.0001"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
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
            disabled={saving || !pharmacyId}
            className="bg-[#5cb85c] text-white hover:bg-[#449d44]"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Conversion
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
