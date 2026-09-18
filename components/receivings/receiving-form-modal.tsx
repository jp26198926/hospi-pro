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
import type { Receiving } from "./receivings-columns";

interface SelectOption {
  value: string;
  label: string;
}

interface ReceivingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  receiving: Receiving | null;
  onSuccess: () => void;
}

export function ReceivingFormModal({
  open,
  onOpenChange,
  mode,
  receiving,
  onSuccess,
}: ReceivingFormModalProps) {
  const [date, setDate] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [supplierOptions, setSupplierOptions] = useState<SelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      if (mode === "edit" && receiving) {
        setDate(formatDateOnly(receiving.date, "UTC"));
        setSupplierId(String(receiving.supplierId));
        setLocationId(String(receiving.locationId));
        setPoNumber(receiving.poNumber || "");
        setInvoiceNumber(receiving.invoiceNumber || "");
        setRemarks(receiving.remarks || "");
      } else {
        setDate(formatDateOnly(new Date(), "UTC"));
        setSupplierId("");
        setLocationId("");
        setPoNumber("");
        setInvoiceNumber("");
        setRemarks("");
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function loadLookups() {
      const [supRes, locRes] = await Promise.all([
        fetch("/api/suppliers?limit=100&status=Active&sortBy=name&sortOrder=asc"),
        fetch("/api/locations?limit=100&status=Active&sortBy=name&sortOrder=asc"),
      ]);
      if (cancelled) return;
      if (supRes.ok) {
        const json = await supRes.json();
        setSupplierOptions(
          (json.data || []).map((r: { id: number; name: string }) => ({
            value: String(r.id),
            label: r.name,
          }))
        );
      }
      if (locRes.ok) {
        const json = await locRes.json();
        setLocationOptions(
          (json.data || []).map((r: { id: number; name: string }) => ({
            value: String(r.id),
            label: r.name,
          }))
        );
      }
    }
    loadLookups();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const onSubmit = async () => {
    if (!date || !supplierId || !locationId) {
      toast.error("Date, supplier, and location are required");
      return;
    }
    setSaving(true);
    try {
      const url =
        mode === "edit" && receiving
          ? `/api/receivings/${receiving.id}`
          : "/api/receivings";
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          supplierId: Number(supplierId),
          locationId: Number(locationId),
          poNumber: poNumber.trim() || null,
          invoiceNumber: invoiceNumber.trim() || null,
          remarks: remarks.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Something went wrong");
        return;
      }
      toast.success(
        mode === "edit"
          ? "Receiving updated successfully"
          : "Receiving created successfully"
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
      <DialogContent className="sm:max-w-lg rounded-sm border-[#ddd] p-0">
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#337ab7] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">
            {mode === "edit"
              ? `Edit ${receiving?.transNo || "Receiving"}`
              : "Add New Receiving"}
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
              Date <span className="text-red-500">*</span>
            </Label>
            <DatePicker id="receiving-date" value={date} onValueChange={setDate} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">
                Supplier <span className="text-red-500">*</span>
              </Label>
              <SearchableSelect
                options={supplierOptions}
                value={supplierId}
                onValueChange={setSupplierId}
                placeholder="Select supplier"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">
                Location <span className="text-red-500">*</span>
              </Label>
              <SearchableSelect
                options={locationOptions}
                value={locationId}
                onValueChange={setLocationId}
                placeholder="Select location"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">PO No.</Label>
              <Input
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="Optional"
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">Invoice No.</Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Optional"
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
          {mode === "add" && (
            <p className="text-xs text-muted-foreground">
              After saving, open the receiving to add line items.
            </p>
          )}
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
            {mode === "edit" ? "Update" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
