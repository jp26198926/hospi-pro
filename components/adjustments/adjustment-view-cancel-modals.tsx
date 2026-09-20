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
import { statusBadge, fmtQty, fmtAdj, type Adjustment } from "./adjustments-columns";
import { printDocumentPdf, fmtPrintNum } from "@/lib/print/document-print";

interface AdjustmentViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adjustment: Adjustment | null;
  timezone: string;
  appSettings?: {
    appName: string;
    appLogo: string | null;
    address: string | null;
    phone: string | null;
  };
}

interface AdjustmentCancelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adjustment: Adjustment | null;
  onSuccess: () => void;
}

export function AdjustmentViewModal({
  open,
  onOpenChange,
  adjustment,
  timezone,
  appSettings,
}: AdjustmentViewModalProps) {
  if (!adjustment) return null;

  const handlePrint = async () => {
    if (!adjustment) return;
    await printDocumentPdf({
      appSettings,
      documentNo: adjustment.transNo || `ADJ-${String(adjustment.id).padStart(5, "0")}`,
      documentNoLabel: "Adjustment No.",
      title: "ADJUSTMENT",
      fieldsLeft: [
        { label: "Date", value: formatDateOnly(adjustment.date, timezone) },
        { label: "Location", value: adjustment.locationName },
        {
          label: "Product",
          value: `${adjustment.productCode} — ${adjustment.productName}`,
        },
        { label: "UOM", value: adjustment.uomName || "-" },
      ],
      fieldsRight: [
        { label: "Status", badge: adjustment.status === "Cancelled" ? "Cancelled" : "Completed" },
      ],
      sectionTitle: "Adjustment Details",
      tableColumns: [
        { key: "old", header: "OLD QTY", align: "right", width: 40 },
        { key: "adj", header: "ADJ QTY", align: "right", width: 40 },
        { key: "new", header: "NEW QTY", align: "right", width: 40 },
      ],
      tableRows: [
        {
          old: fmtPrintNum(adjustment.qtyOld),
          adj: fmtPrintNum(adjustment.qtyAdj),
          new: fmtPrintNum(adjustment.qtyNew),
        },
      ],
      remarks: adjustment.remarks,
      leftSignatureLabel: "Adjusted By:",
      leftSignatureName: adjustment.createdByDisplay || undefined,
      leftSignatureCaption: "Staff Signature",
      rightSignatureLabel: "Verified By:",
      rightSignatureCaption: "Authorized Signature",
      timezone,
      fileName: `${
        adjustment.transNo || `ADJ-${String(adjustment.id).padStart(5, "0")}`
      }.pdf`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="flex max-h-[90vh] flex-col rounded-sm border-[#ddd] p-0 sm:max-w-lg">
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#337ab7] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">
            Adjustment{" "}
            {adjustment.transNo || `ADJ-${String(adjustment.id).padStart(5, "0")}`}
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 grid grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2">
          <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">Date</dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">
              {formatDateOnly(adjustment.date, timezone)}
            </dd>
          </div>
          <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">Status</dt>
            <dd className="mt-1">
              <span
                className={`inline-block px-2 py-0.5 text-xs font-medium ${statusBadge(adjustment.status)}`}
              >
                {adjustment.status}
              </span>
            </dd>
          </div>
          <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">
              Location
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">
              {adjustment.locationName}
            </dd>
          </div>
          <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">UOM</dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">
              {adjustment.uomName || "-"}
            </dd>
          </div>
          <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">
              Product
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">
              {adjustment.productCode} — {adjustment.productName}
            </dd>
          </div>
          <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">
              Old Qty
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">
              {fmtQty(adjustment.qtyOld)}
            </dd>
          </div>
          <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">
              Adj Qty
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">
              {fmtAdj(adjustment.qtyAdj)}
            </dd>
          </div>
          <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">
              New Qty
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">
              {fmtQty(adjustment.qtyNew)}
            </dd>
          </div>
          <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase text-muted-foreground">
              Remarks
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">
              {adjustment.remarks || "-"}
            </dd>
          </div>
          {adjustment.createdAt && (
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Created At
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-foreground">
                {formatDateOnly(adjustment.createdAt, timezone)}
              </dd>
            </div>
          )}
          {adjustment.createdByDisplay && adjustment.createdByDisplay !== "-" && (
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Created By
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-foreground">
                {adjustment.createdByDisplay}
              </dd>
            </div>
          )}
          {adjustment.updatedAt && (
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Updated At
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-foreground">
                {formatDateOnly(adjustment.updatedAt, timezone)}
              </dd>
            </div>
          )}
          {adjustment.updatedByDisplay && adjustment.updatedByDisplay !== "-" && (
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Updated By
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-foreground">
                {adjustment.updatedByDisplay}
              </dd>
            </div>
          )}
          {adjustment.deletedAt && (
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Deleted At
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-foreground">
                {formatDateOnly(adjustment.deletedAt, timezone)}
              </dd>
            </div>
          )}
          {adjustment.deletedByDisplay && adjustment.deletedByDisplay !== "-" && (
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Deleted By
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-foreground">
                {adjustment.deletedByDisplay}
              </dd>
            </div>
          )}
          {adjustment.deletedReason && (
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Deleted Reason
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-foreground">
                {adjustment.deletedReason}
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

export function AdjustmentCancelModal({
  open,
  onOpenChange,
  adjustment,
  onSuccess,
}: AdjustmentCancelModalProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    if (!adjustment) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/adjustments/${adjustment.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to cancel adjustment");
        return;
      }
      toast.success(json.message || "Adjustment cancelled");
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
      <DialogContent showCloseButton={false} className="flex max-h-[90vh] flex-col rounded-sm border-[#ddd] p-0 sm:max-w-md">
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#d9534f] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">
            Cancel Adjustment
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
              {adjustment?.transNo ||
                (adjustment
                  ? `ADJ-${String(adjustment.id).padStart(5, "0")}`
                  : "")}
            </strong>
            ? Stock will be reversed (sign of adj qty inverted).
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
            Cancel Adjustment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
