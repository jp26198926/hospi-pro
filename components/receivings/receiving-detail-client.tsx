"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDateOnly } from "@/lib/datetime";
import { statusBadge, type ReceivingStatus } from "./receivings-columns";
import { ReceivingFormModal } from "./receiving-form-modal";
import { ReceivingActionModal } from "./receiving-action-modal";
import { ReceivingItemsTable } from "@/components/receiving-items/receiving-items-table";
import { Pencil, CheckCircle2, Printer, XCircle, RotateCcw } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ReceivingDetail {
  id: number;
  transNo: string;
  date: Date | string;
  supplierId: number;
  supplierName: string;
  locationId: number;
  locationName: string | null;
  poNumber: string | null;
  invoiceNumber: string | null;
  remarks: string | null;
  status: ReceivingStatus;
  createdAt: Date | string;
  updatedAt: Date | string | null;
  cancelledAt: Date | string | null;
  cancelledReason: string | null;
  createdByEmail: string | null;
}

interface ReceivingDetailClientProps {
  initial: ReceivingDetail;
  timezone: string;
}

function fmtNum(v: string | number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toFixed(4).replace(/\.?0+$/, "") || "0";
}

export function ReceivingDetailClient({
  initial,
  timezone,
}: ReceivingDetailClientProps) {
  const [receiving, setReceiving] = useState(initial);
  const [editOpen, setEditOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [action, setAction] = useState<"complete" | "cancel" | "restore">(
    "complete"
  );

  const refresh = async () => {
    try {
      const res = await fetch(`/api/receivings/${receiving.id}`);
      const json = await res.json();
      if (res.ok) setReceiving(json.data);
    } catch {
      // ignore
    }
  };

  const handlePrint = async () => {
    try {
      const res = await fetch(`/api/receiving-items?receivingId=${receiving.id}&limit=100&sortBy=id&sortOrder=asc`);
      const json = await res.json();
      const items = res.ok ? json.data || [] : [];

      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text("Receiving Report", 14, 16);
      doc.setFontSize(10);
      doc.text(`Trans #: ${receiving.transNo}`, 14, 26);
      doc.text(`Date: ${formatDateOnly(receiving.date, timezone)}`, 14, 32);
      doc.text(`Supplier: ${receiving.supplierName}`, 14, 38);
      doc.text(`Location: ${receiving.locationName || "-"}`, 14, 44);
      doc.text(`PO No.: ${receiving.poNumber || "-"}`, 14, 50);
      doc.text(`Invoice No.: ${receiving.invoiceNumber || "-"}`, 14, 56);
      doc.text(`Status: ${receiving.status}`, 14, 62);
      if (receiving.remarks) doc.text(`Remarks: ${receiving.remarks}`, 14, 68);

      autoTable(doc, {
        startY: 76,
        head: [["Batch No.", "Product Code", "Product Name", "Qty", "Cost", "Total", "Expiry"]],
        body: items
          .filter((i: { status: string }) => i.status !== "Cancelled")
          .map((item: {
            id: number;
            batchNo?: string;
            productCode: string;
            productName: string;
            qty: string;
            unitCost: string;
            totalCost: string;
            dateExpiry?: string | null;
          }) => [
            item.batchNo || `BATCH-${String(item.id).padStart(6, "0")}`,
            item.productCode,
            item.productName,
            fmtNum(item.qty),
            fmtNum(item.unitCost),
            fmtNum(item.totalCost),
            item.dateExpiry ? formatDateOnly(item.dateExpiry, timezone) : "-",
          ]),
      });

      doc.save(`${receiving.transNo}.pdf`);
    } catch {
      // silent; toast optional
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">
            Receiving {receiving.transNo}
          </h1>
          <p className="text-sm text-muted-foreground">
            Goods receiving transaction details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {receiving.status === "Draft" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
                className="border-[#ccc]"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setAction("complete");
                  setActionOpen(true);
                }}
                className="bg-[#5cb85c] text-white hover:bg-[#449d44]"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark as Completed
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setAction("cancel");
                  setActionOpen(true);
                }}
                className="bg-[#d9534f] text-white hover:bg-[#c9302c]"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </>
          )}
          {receiving.status === "Completed" && (
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-[#337ab7] text-white hover:bg-[#286090]"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          )}
          {receiving.status === "Cancelled" && (
            <Button
              size="sm"
              onClick={() => {
                setAction("restore");
                setActionOpen(true);
              }}
              className="bg-[#f0ad4e] text-white hover:bg-[#ec971f]"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
            <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
              <h2 className="text-sm font-semibold text-[#337ab7]">Receiving Items</h2>
            </div>
            <div className="p-4">
              <ReceivingItemsTable
                receivingId={receiving.id}
                masterStatus={receiving.status}
                timezone={timezone}
                onMutated={refresh}
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
            <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
              <h2 className="text-sm font-semibold text-[#337ab7]">
                Receiving Information
              </h2>
            </div>
            <div className="p-6">
              <dl className="space-y-4">
                {[
                  { label: "Trans #", value: receiving.transNo, accent: true },
                  {
                    label: "Date",
                    value: formatDateOnly(receiving.date, timezone),
                  },
                  { label: "Supplier", value: receiving.supplierName },
                  { label: "Location", value: receiving.locationName || "-" },
                  { label: "PO No.", value: receiving.poNumber || "-" },
                  { label: "Invoice No.", value: receiving.invoiceNumber || "-" },
                  { label: "Remarks", value: receiving.remarks || "-" },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="rounded-sm border border-[#eee] bg-[#fafafa] p-4"
                  >
                    <dt className="text-xs font-semibold uppercase text-muted-foreground">
                      {f.label}
                    </dt>
                    <dd
                      className={`mt-1 text-sm ${
                        f.accent
                          ? "font-semibold text-[#337ab7]"
                          : "font-medium text-foreground"
                      }`}
                    >
                      {f.value}
                    </dd>
                  </div>
                ))}
                <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">
                    Status
                  </dt>
                  <dd className="mt-1">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium ${statusBadge(receiving.status)}`}
                    >
                      {receiving.status}
                    </span>
                  </dd>
                </div>
                <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">
                    Created By
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {receiving.createdByEmail || "-"}
                  </dd>
                </div>
                <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">
                    Created At
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {formatDateOnly(receiving.createdAt, timezone)}
                  </dd>
                </div>
                {receiving.updatedAt && (
                  <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
                    <dt className="text-xs font-semibold uppercase text-muted-foreground">
                      Updated At
                    </dt>
                    <dd className="mt-1 text-sm text-foreground">
                      {formatDateOnly(receiving.updatedAt, timezone)}
                    </dd>
                  </div>
                )}
                {receiving.cancelledAt && (
                  <>
                    <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
                      <dt className="text-xs font-semibold uppercase text-muted-foreground">
                        Cancelled At
                      </dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {formatDateOnly(receiving.cancelledAt, timezone)}
                      </dd>
                    </div>
                    <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
                      <dt className="text-xs font-semibold uppercase text-muted-foreground">
                        Cancel Reason
                      </dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {receiving.cancelledReason || "-"}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>

      <ReceivingFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        receiving={receiving}
        onSuccess={refresh}
      />
      <ReceivingActionModal
        open={actionOpen}
        onOpenChange={setActionOpen}
        action={action}
        receiving={receiving}
        onSuccess={refresh}
      />
    </div>
  );
}
