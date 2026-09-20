"use client";

import { useState } from "react";
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
import { formatDateOnly } from "@/lib/datetime";
import { statusBadge, fmtQty, type Conversion } from "./conversions-columns";
import { printDocumentPdf, fmtPrintNum } from "@/lib/print/document-print";

interface ConversionViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversion: Conversion | null;
  timezone: string;
  appSettings?: {
    appName: string;
    appLogo: string | null;
    address: string | null;
    phone: string | null;
  };
}

interface ConversionCancelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversion: Conversion | null;
  onSuccess: () => void;
}

export function ConversionViewModal({
  open,
  onOpenChange,
  conversion,
  timezone,
  appSettings,
}: ConversionViewModalProps) {
  if (!conversion) return null;

  const handlePrint = async () => {
    if (!conversion) return;
    const transNo =
      conversion.transNo || `CNV-${String(conversion.id).padStart(5, "0")}`;
    await printDocumentPdf({
      appSettings,
      documentNo: transNo,
      documentNoLabel: "Conversion No.",
      title: "CONVERSION",
      fieldsLeft: [
        { label: "Date", value: formatDateOnly(conversion.date, timezone) },
        { label: "Location", value: conversion.locationName },
        {
          label: "From Product",
          value: `${conversion.fromProductCode} — ${conversion.fromProductName}`,
        },
        { label: "From UOM", value: conversion.fromUomName || "-" },
      ],
      fieldsRight: [
        {
          label: "Status",
          badge:
            conversion.status === "Cancelled" ? "Cancelled" : "Completed",
        },
        {
          label: "To Product",
          value: `${conversion.toProductCode} — ${conversion.toProductName}`,
        },
        { label: "To UOM", value: conversion.toUomName || "-" },
      ],
      sectionTitle: "Conversion Details",
      tableColumns: [
        { key: "fromQty", header: "FROM QTY", align: "right", width: 40 },
        { key: "toQty", header: "TO QTY", align: "right", width: 40 },
      ],
      tableRows: [
        {
          fromQty: fmtPrintNum(conversion.fromQty),
          toQty: fmtPrintNum(conversion.newQty),
        },
      ],
      remarks: conversion.remarks,
      leftSignatureLabel: "Converted By:",
      leftSignatureName: conversion.createdByDisplay || undefined,
      leftSignatureCaption: "Staff Signature",
      rightSignatureLabel: "Verified By:",
      rightSignatureCaption: "Authorized Signature",
      timezone,
      fileName: `${transNo}.pdf`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] flex-col rounded-sm border-[#ddd] p-0 sm:max-w-xl"
      >
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#337ab7] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">
            Conversion{" "}
            {conversion.transNo || `CNV-${String(conversion.id).padStart(5, "0")}`}
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2">
          <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">Date</dt>
            <dd className="mt-0.5 text-sm font-medium">
              {formatDateOnly(conversion.date, timezone)}
            </dd>
          </div>
          <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">
              Status
            </dt>
            <dd className="mt-1">
              <span
                className={`inline-block px-2 py-0.5 text-xs font-medium ${statusBadge(conversion.status)}`}
              >
                {conversion.status}
              </span>
            </dd>
          </div>
          <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">
              Location
            </dt>
            <dd className="mt-0.5 text-sm font-medium">{conversion.locationName}</dd>
          </div>
          <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">
              From Product
            </dt>
            <dd className="mt-0.5 text-sm font-medium">
              {conversion.fromProductCode} — {conversion.fromProductName}
            </dd>
          </div>
          <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">
              From UOM
            </dt>
            <dd className="mt-0.5 text-sm font-medium">
              {conversion.fromUomName || "-"}
            </dd>
          </div>
          <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">
              From Qty
            </dt>
            <dd className="mt-0.5 text-right text-sm font-medium text-[#d9534f]">
              {fmtQty(conversion.fromQty)}
            </dd>
          </div>
          <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">
              To Product
            </dt>
            <dd className="mt-0.5 text-sm font-medium">
              {conversion.toProductCode} — {conversion.toProductName}
            </dd>
          </div>
          <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">
              To UOM
            </dt>
            <dd className="mt-0.5 text-sm font-medium">
              {conversion.toUomName || "-"}
            </dd>
          </div>
          <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">
              To Qty
            </dt>
            <dd className="mt-0.5 text-right text-sm font-medium text-[#5cb85c]">
              {fmtQty(conversion.newQty)}
            </dd>
          </div>
          <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">
              Remarks
            </dt>
            <dd className="mt-0.5 text-sm font-medium">{conversion.remarks || "-"}</dd>
          </div>
          {conversion.createdAt && (
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Created At
              </dt>
              <dd className="mt-0.5 text-sm font-medium">
                {formatDateOnly(conversion.createdAt, timezone)}
              </dd>
            </div>
          )}
          {conversion.createdByDisplay && conversion.createdByDisplay !== "-" && (
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Created By
              </dt>
              <dd className="mt-0.5 text-sm font-medium">
                {conversion.createdByDisplay}
              </dd>
            </div>
          )}
          {conversion.updatedAt && (
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Updated At
              </dt>
              <dd className="mt-0.5 text-sm font-medium">
                {formatDateOnly(conversion.updatedAt, timezone)}
              </dd>
            </div>
          )}
          {conversion.updatedByDisplay && conversion.updatedByDisplay !== "-" && (
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Updated By
              </dt>
              <dd className="mt-0.5 text-sm font-medium">
                {conversion.updatedByDisplay}
              </dd>
            </div>
          )}
          {conversion.deletedAt && (
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Deleted At
              </dt>
              <dd className="mt-0.5 text-sm font-medium">
                {formatDateOnly(conversion.deletedAt, timezone)}
              </dd>
            </div>
          )}
          {conversion.deletedByDisplay && conversion.deletedByDisplay !== "-" && (
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Deleted By
              </dt>
              <dd className="mt-0.5 text-sm font-medium">
                {conversion.deletedByDisplay}
              </dd>
            </div>
          )}
          {conversion.deletedReason && (
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Deleted Reason
              </dt>
              <dd className="mt-0.5 text-sm font-medium">
                {conversion.deletedReason}
              </dd>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#eee] bg-[#f8f8f8] px-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#ccc]"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="bg-[#337ab7] text-white hover:bg-[#286090]"
          >
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConversionCancelModal({
  open,
  onOpenChange,
  conversion,
  onSuccess,
}: ConversionCancelModalProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    if (!conversion) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/conversions/${conversion.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to cancel conversion");
        return;
      }
      toast.success(json.message || "Conversion cancelled");
      setReason("");
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] flex-col rounded-sm border-[#ddd] p-0 sm:max-w-md"
      >
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#d9534f] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">
            Cancel Conversion
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <p className="text-sm text-[#333]">
            Cancel{" "}
            <strong className="text-[#337ab7]">
              {conversion?.transNo ||
                (conversion ? `CNV-${String(conversion.id).padStart(5, "0")}` : "")}
            </strong>
            ? Stock will be reversed for both products.
          </p>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">
              Reason (optional)
            </Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#eee] bg-[#f8f8f8] px-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-[#ccc]"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="bg-[#d9534f] text-white hover:bg-[#c9302c]"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancel Conversion
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
