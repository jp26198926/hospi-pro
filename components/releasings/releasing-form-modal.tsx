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
import type { Releasing } from "./releasings-columns";

interface SelectOption {
  value: string;
  label: string;
}

interface ReleasingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  releasing: Releasing | null;
  onSuccess: () => void;
}

export function ReleasingFormModal({
  open,
  onOpenChange,
  mode,
  releasing,
  onSuccess,
}: ReleasingFormModalProps) {
  const [date, setDate] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      if (mode === "edit" && releasing) {
        setDate(formatDateOnly(releasing.date, "UTC"));
        setFromLocationId(String(releasing.fromLocationId));
        setToLocationId(
          releasing.toLocationId ? String(releasing.toLocationId) : ""
        );
        setReceiverName(releasing.receiverName);
        setRemarks(releasing.remarks || "");
      } else {
        setDate(formatDateOnly(new Date(), "UTC"));
        setFromLocationId("");
        setToLocationId("");
        setReceiverName("");
        setRemarks("");
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function loadLocations() {
      try {
        const res = await fetch(
          "/api/locations?limit=100&status=Active&sortBy=name&sortOrder=asc"
        );
        const json = await res.json();
        if (!res.ok || cancelled) return;
        setLocationOptions(
          (json.data || []).map((r: { id: number; name: string }) => ({
            value: String(r.id),
            label: r.name,
          }))
        );
      } catch {
        // ignore
      }
    }
    loadLocations();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const onSubmit = async () => {
    if (!date || !fromLocationId || !receiverName.trim()) {
      toast.error("Date, from location, and receiver are required");
      return;
    }
    setSaving(true);
    try {
      const url =
        mode === "edit" && releasing
          ? `/api/releasings/${releasing.id}`
          : "/api/releasings";
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          fromLocationId: Number(fromLocationId),
          toLocationId: toLocationId ? Number(toLocationId) : null,
          receiverName: receiverName.trim(),
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
          ? "Releasing updated successfully"
          : "Releasing created successfully"
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
            {mode === "edit"
              ? `Edit ${releasing?.transNo || "Releasing"}`
              : "Add New Releasing"}
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
            <DatePicker id="releasing-date" value={date} onValueChange={setDate} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">
                From Location <span className="text-red-500">*</span>
              </Label>
              <SearchableSelect
                options={locationOptions}
                value={fromLocationId}
                onValueChange={setFromLocationId}
                placeholder="Select from location"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">
                To Location
              </Label>
              <SearchableSelect
                options={locationOptions}
                value={toLocationId}
                onValueChange={setToLocationId}
                placeholder="Optional"
                allOption
                allLabel="None"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">
              Receiver <span className="text-red-500">*</span>
            </Label>
            <Input
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="Person or department receiving"
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
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
          {mode === "add" && (
            <p className="text-xs text-muted-foreground">
              After saving, open the releasing to add items or scan barcodes.
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
