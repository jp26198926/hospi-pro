"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDateOnly } from "@/lib/datetime";
import { statusBadge, type TransferStatus } from "./transfers-columns";
import { TransferFormModal } from "./transfer-form-modal";
import { TransferActionModal } from "./transfer-action-modal";
import { TransferItemsTable } from "@/components/transfer-items/transfer-items-table";
import { TransferScanBar } from "./transfer-scan-bar";
import {
  Pencil,
  CheckCircle2,
  Printer,
  XCircle,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import { fmtPrintNum, printDocumentPdf } from "@/lib/print/document-print";

export interface TransferDetail {
  id: number;
  transNo: string;
  date: Date | string;
  fromLocationId: number;
  fromLocationName: string;
  toLocationId: number;
  toLocationName: string | null;
  remarks: string | null;
  status: TransferStatus;
  createdAt: Date | string;
  updatedAt: Date | string | null;
  deletedAt: Date | string | null;
  deletedReason: string | null;
  createdByDisplay?: string;
  updatedByDisplay?: string;
  deletedByDisplay?: string;
}

interface TransferDetailClientProps {
  initial: TransferDetail;
  timezone: string;
  appSettings?: {
    appName: string;
    appLogo: string | null;
    address: string | null;
    phone: string | null;
  };
}

export function TransferDetailClient({
  initial,
  timezone,
  appSettings,
}: TransferDetailClientProps) {
  const [transfer, setTransfer] = useState(initial);
  const [itemsReloadKey, setItemsReloadKey] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [action, setAction] = useState<"complete" | "cancel" | "restore">(
    "complete"
  );

  const refresh = async () => {
    try {
      const res = await fetch(`/api/transfers/${transfer.id}`);
      const json = await res.json();
      if (res.ok) setTransfer(json.data);
    } catch {
      // ignore
    }
    setItemsReloadKey((k) => k + 1);
  };

  const handlePrint = async () => {
    try {
      const res = await fetch(
        `/api/transfer-items?transferId=${transfer.id}&limit=100&sortBy=id&sortOrder=asc`
      );
      const json = await res.json();
      const items = res.ok
        ? (json.data || []).filter(
            (i: { status: string }) => i.status !== "Cancelled"
          )
        : [];

      await printDocumentPdf({
        appSettings,
        documentNo: transfer.transNo,
        documentNoLabel: "Transfer No.",
        title: "TRANSFER",
        fieldsLeft: [
          { label: "Date", value: formatDateOnly(transfer.date, timezone) },
          { label: "From Location", value: transfer.fromLocationName },
          { label: "To Location", value: transfer.toLocationName || "-" },
        ],
        fieldsRight: [{ label: "Status", badge: transfer.status }],
        sectionTitle: "Transfer Items",
        tableColumns: [
          { key: "no", header: "NO", align: "center", width: 9 },
          { key: "series", header: "SERIES #", align: "center", width: 24 },
          { key: "desc", header: "ITEM DESCRIPTION", align: "left" },
          { key: "qty", header: "QTY", align: "right", width: 20 },
          { key: "uom", header: "UOM", align: "left", width: 16 },
          { key: "remarks", header: "REMARKS", align: "left", width: 24 },
          { key: "status", header: "STATUS", align: "center", width: 20 },
        ],
        tableRows: items.map(
          (
            item: {
              id: number;
              seriesNo?: string;
              productCode: string;
              productName: string;
              uomName?: string | null;
              qty: string;
              remarks: string | null;
              status: string;
            },
            i: number
          ) => ({
            no: String(i + 1),
            series: item.seriesNo || `TI-${String(item.id).padStart(6, "0")}`,
            desc: `${item.productCode} - ${item.productName}`,
            qty: fmtPrintNum(item.qty),
            uom: item.uomName || "-",
            remarks: item.remarks || "",
            status: String(item.status).toUpperCase(),
          })
        ),
        remarks: transfer.remarks,
        leftSignatureLabel: "Released By:",
        leftSignatureName: transfer.createdByDisplay,
        leftSignatureCaption: "Staff Signature",
        rightSignatureLabel: "Received By:",
        rightSignatureCaption: "Authorized Signature",
        timezone,
        fileName: `${transfer.transNo}.pdf`,
      });
    } catch (error) {
      console.error("Print failed:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">
            Transfer {transfer.transNo}
          </h1>
          <p className="text-sm text-muted-foreground">
            Location-to-location stock transfer details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/transfers">
            <Button variant="outline" size="sm" className="border-[#ccc]">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          {transfer.status === "Draft" && (
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
          {transfer.status === "Completed" && (
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-[#337ab7] text-white hover:bg-[#286090]"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          )}
          {transfer.status === "Cancelled" && (
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
              <h2 className="text-sm font-semibold text-[#337ab7]">Transfer Items</h2>
            </div>
            <div className="space-y-4 p-4">
              {transfer.status === "Draft" && (
                <TransferScanBar
                  transferId={transfer.id}
                  fromLocationId={transfer.fromLocationId}
                  onSuccess={() => setItemsReloadKey((k) => k + 1)}
                />
              )}
              <TransferItemsTable
                transferId={transfer.id}
                masterStatus={transfer.status}
                timezone={timezone}
                onMutated={refresh}
                reloadKey={itemsReloadKey}
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
            <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
              <h2 className="text-sm font-semibold text-[#337ab7]">Transfer Information</h2>
            </div>
            <div className="p-6">
              <dl className="space-y-4">
                {[
                  { label: "Trans #", value: transfer.transNo, accent: true },
                  {
                    label: "Date",
                    value: formatDateOnly(transfer.date, timezone),
                  },
                  { label: "From Location", value: transfer.fromLocationName },
                  { label: "To Location", value: transfer.toLocationName || "-" },
                  { label: "Remarks", value: transfer.remarks || "-" },
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
                      className={`inline-block px-2 py-0.5 text-xs font-medium ${statusBadge(transfer.status)}`}
                    >
                      {transfer.status}
                    </span>
                  </dd>
                </div>
                <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">
                    Created By
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {transfer.createdByDisplay || "-"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <TransferFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        transfer={transfer}
        onSuccess={refresh}
      />
      <TransferActionModal
        open={actionOpen}
        onOpenChange={setActionOpen}
        action={action}
        transfer={transfer}
        onSuccess={refresh}
      />
    </div>
  );
}
