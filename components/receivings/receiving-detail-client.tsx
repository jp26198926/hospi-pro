"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDateOnly } from "@/lib/datetime";
import { statusBadge, type ReceivingStatus } from "./receivings-columns";
import { ReceivingFormModal } from "./receiving-form-modal";
import { ReceivingActionModal } from "./receiving-action-modal";
import { ReceivingItemsTable } from "@/components/receiving-items/receiving-items-table";
import {
  Pencil,
  CheckCircle2,
  Printer,
  XCircle,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
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
  deletedAt: Date | string | null;
  deletedReason: string | null;
  createdByEmail: string | null;
  createdByDisplay?: string;
  updatedByDisplay?: string;
  deletedByDisplay?: string;
}

interface ReceivingDetailClientProps {
  initial: ReceivingDetail;
  timezone: string;
  appSettings?: {
    appName: string;
    appLogo: string | null;
    address: string | null;
    phone: string | null;
    appTagline: string | null;
  };
}

function fmtNum(v: string | number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toFixed(4);
}

function statusFill(status: ReceivingStatus): [number, number, number] {
  if (status === "Completed") return [92, 184, 92];
  if (status === "Cancelled") return [217, 83, 79];
  return [240, 173, 78];
}

async function loadLogoDataUrl(logo: string | null): Promise<string | null> {
  if (!logo) return null;
  try {
    const url =
      logo.startsWith("http") || logo.startsWith("/") ? logo : `/${logo}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function ReceivingDetailClient({
  initial,
  timezone,
  appSettings,
}: ReceivingDetailClientProps) {
  const [receiving, setReceiving] = useState(initial);
  const [editOpen, setEditOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [action, setAction] = useState<"complete" | "cancel" | "restore">(
    "complete",
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
      const res = await fetch(
        `/api/receiving-items?receivingId=${receiving.id}&limit=100&sortBy=id&sortOrder=asc`,
      );
      const json = await res.json();
      const items = res.ok
        ? (json.data || []).filter(
            (i: { status: string }) => i.status !== "Cancelled",
          )
        : [];

      const logoDataUrl = await loadLogoDataUrl(appSettings?.appLogo ?? null);
      const appName = appSettings?.appName || "RBAC System";
      const address = appSettings?.address || null;
      const phone = appSettings?.phone || null;

      const BLUE: [number, number, number] = [44, 95, 138];
      const GRAY: [number, number, number] = [102, 102, 102];
      const DARK: [number, number, number] = [51, 51, 51];
      const LIGHT_GRAY: [number, number, number] = [153, 153, 153];

      const doc = new jsPDF();
      const pageW = 210;
      const pageH = 297;
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = 10;

      // Header: logo + company (left) | Receiving No. (right)
      let textX = margin;
      if (logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, "PNG", margin, y, 14, 14);
          textX = margin + 17;
        } catch {
          textX = margin;
        }
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...BLUE);
      doc.text(appName, textX, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...GRAY);
      let infoY = y + 10;
      if (address) {
        doc.text(address, textX, infoY);
        infoY += 4.5;
      }
      if (phone) {
        doc.text(phone, textX, infoY);
      }

      doc.setFontSize(9);
      doc.setTextColor(...GRAY);
      doc.setFont("helvetica", "normal");
      doc.text("Receiving No.", pageW - margin, y + 2, { align: "right" });
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BLUE);
      doc.text(receiving.transNo, pageW - margin, y + 10, { align: "right" });

      y = Math.max(y + 20, infoY + 4);
      doc.setDrawColor(...BLUE);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageW - margin, y);
      y += 4;

      // Title banner
      doc.setFillColor(238, 242, 247);
      doc.roundedRect(margin, y, contentW, 10, 1, 1, "F");
      doc.setFillColor(...BLUE);
      doc.rect(margin, y, 2.5, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...BLUE);
      doc.text("RECEIVING", pageW / 2, y + 6.5, { align: "center" });
      y += 14;

      // Fields box
      const boxH = 32;
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(221);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y, contentW, boxH, 1, 1, "FD");
      const leftX = margin + 4;
      const rightX = margin + contentW / 2 + 2;
      const rowH = 9;
      let ry = y + 7;

      const drawField = (
        x: number,
        fieldY: number,
        label: string,
        value: string,
      ) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...DARK);
        doc.text(`${label}:`, x, fieldY);
        const labelW = doc.getTextWidth(`${label}: `);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...DARK);
        doc.text(value || "-", x + labelW, fieldY);
        doc.setDrawColor(204);
        doc.setLineWidth(0.2);
        doc.line(x, fieldY + 1.5, x + contentW / 2 - 8, fieldY + 1.5);
      };

      drawField(leftX, ry, "Date", formatDateOnly(receiving.date, timezone));
      drawField(rightX, ry, "Status", "");
      const [sr, sg, sb] = statusFill(receiving.status);
      doc.setFillColor(sr, sg, sb);
      const statusText = receiving.status.toUpperCase();
      const badgeW = doc.getTextWidth(statusText) + 8;
      doc.roundedRect(rightX + 20, ry - 4.5, badgeW, 7, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(statusText, rightX + 24, ry + 0.2);

      ry += rowH;
      drawField(leftX, ry, "Supplier", receiving.supplierName);
      drawField(rightX, ry, "Invoice No", receiving.invoiceNumber || "-");

      ry += rowH;
      drawField(leftX, ry, "PO Number", receiving.poNumber || "-");
      drawField(rightX, ry, "Location", receiving.locationName || "-");

      y += boxH + 6;

      // Received Items
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...BLUE);
      doc.text("Received Items", margin, y);
      y += 1.5;
      doc.setDrawColor(...BLUE);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageW - margin, y);
      y += 3;

      type PrintItem = {
        id: number;
        batchNo?: string;
        productCode: string;
        productName: string;
        uomName?: string | null;
        qty: string;
        unitCost: string;
        totalCost: string;
        remarks: string | null;
        status: string;
      };

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [
          [
            "NO",
            "BATCH #",
            "ITEM\n DESCRIPTION",
            "QTY",
            "UOM",
            "UNIT\n PRICE",
            "TOTAL\n COST",
            "REMARKS",
            "STATUS",
          ],
        ],
        body: items.map((item: PrintItem, i: number) => [
          String(i + 1),
          item.batchNo || `BATCH-${String(item.id).padStart(6, "0")}`,
          `${item.productCode} - ${item.productName}`,
          fmtNum(item.qty),
          item.uomName || "-",
          fmtNum(item.unitCost),
          fmtNum(item.totalCost),
          item.remarks || "",
          String(item.status).toUpperCase(),
        ]),
        headStyles: {
          fillColor: BLUE,
          textColor: 255,
          fontStyle: "bold",
          fontSize: 7.5,
          halign: "center",
          valign: "middle",
        },
        bodyStyles: { fontSize: 7.5, textColor: DARK, cellPadding: 1.8 },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        styles: { lineColor: [224, 224, 224], lineWidth: 0.2 },
        columnStyles: {
          0: { halign: "center", cellWidth: 9 },
          1: { halign: "center", cellWidth: 22 },
          2: { halign: "left" },
          3: { halign: "right", cellWidth: 18 },
          4: { halign: "left", cellWidth: 14 },
          5: { halign: "right", cellWidth: 20 },
          6: { halign: "right", cellWidth: 20 },
          7: { halign: "left", cellWidth: 20 },
          8: { halign: "center", cellWidth: 20 },
        },
      });

      y =
        ((doc as unknown as { lastAutoTable?: { finalY: number } })
          .lastAutoTable?.finalY ?? y + 20) + 6;

      // Remarks
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...BLUE);
      doc.text("REMARKS:", margin, y);
      y += 2;
      const remarksH = 18;
      doc.setDrawColor(221);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentW, remarksH, 1, 1, "S");
      if (receiving.remarks) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...DARK);
        doc.text(receiving.remarks, margin + 2, y + 5, {
          maxWidth: contentW - 4,
        });
      }
      y += remarksH + 8;

      // Signatures
      const sigW = 65;
      const sigL = margin + 5;
      const sigR = margin + contentW / 2 + 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text("Received By:", sigL, y);
      doc.text("Verified By:", sigR, y);

      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.line(sigL, y + 14, sigL + sigW, y + 14);
      doc.line(sigR, y + 14, sigR + sigW, y + 14);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      if (receiving.createdByDisplay && receiving.createdByDisplay !== "-") {
        doc.text(receiving.createdByDisplay, sigL + sigW / 2, y + 18, {
          align: "center",
        });
      }
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...LIGHT_GRAY);
      doc.text("Staff Signature", sigL + sigW / 2, y + 22, { align: "center" });
      doc.text("Authorized Signature", sigR + sigW / 2, y + 22, {
        align: "center",
      });

      // Footer
      const footerY = pageH - 10;
      doc.setDrawColor(221);
      doc.setLineWidth(0.2);
      doc.line(margin, footerY - 3, pageW - margin, footerY - 3);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...LIGHT_GRAY);
      const stamp = new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone || undefined,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date());
      doc.text(
        `Generated on ${stamp} | This is a computer-generated document`,
        pageW / 2,
        footerY,
        { align: "center" },
      );

      doc.save(`${receiving.transNo}.pdf`);
    } catch (error) {
      console.error("Print failed:", error);
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
          <Link href="/receivings">
            <Button variant="outline" size="sm" className="border-[#ccc]">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
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
              <h2 className="text-sm font-semibold text-[#337ab7]">
                Receiving Items
              </h2>
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
                  {
                    label: "Invoice No.",
                    value: receiving.invoiceNumber || "-",
                  },
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
                    {receiving.createdByDisplay ||
                      receiving.createdByEmail ||
                      "-"}
                  </dd>
                </div>
                <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">
                    Updated By
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {receiving.updatedByDisplay || "-"}
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
                {receiving.deletedAt && (
                  <>
                    <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
                      <dt className="text-xs font-semibold uppercase text-muted-foreground">
                        Deleted At
                      </dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {formatDateOnly(receiving.deletedAt, timezone)}
                      </dd>
                    </div>
                    <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
                      <dt className="text-xs font-semibold uppercase text-muted-foreground">
                        Deleted By
                      </dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {receiving.deletedByDisplay || "-"}
                      </dd>
                    </div>
                    <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
                      <dt className="text-xs font-semibold uppercase text-muted-foreground">
                        Deleted Reason
                      </dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {receiving.deletedReason || "-"}
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
