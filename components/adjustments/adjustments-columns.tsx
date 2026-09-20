"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Eye, Trash2 } from "lucide-react";
import { formatDateOnly } from "@/lib/datetime";

export type AdjustmentStatus = "Completed" | "Cancelled";

export interface Adjustment {
  id: number;
  transNo?: string;
  date: Date | string;
  locationId: number;
  locationName: string;
  productId: number;
  productCode: string;
  productName: string;
  uomId?: number | null;
  uomName?: string | null;
  qtyOld: string;
  qtyAdj: string;
  qtyNew: string;
  remarks: string | null;
  status: AdjustmentStatus;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
  deletedAt?: Date | string | null;
  deletedReason?: string | null;
  createdByDisplay?: string | null;
  updatedByDisplay?: string | null;
  deletedByDisplay?: string | null;
}

export function fmtQty(v: string | number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toFixed(4);
}

export function fmtAdj(v: string | number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  const abs = Math.abs(n).toFixed(4);
  return n < 0 ? `-${abs}` : `+${abs}`;
}

export function statusBadge(status: AdjustmentStatus) {
  if (status === "Cancelled") return "bg-[#d9534f] text-white";
  return "bg-[#5cb85c] text-white";
}

export function getAdjustmentColumns({
  onView,
  onCancel,
  timezone,
}: {
  onView: (row: Adjustment) => void;
  onCancel: (row: Adjustment) => void;
  timezone: string;
}): ColumnDef<Adjustment>[] {
  return [
    {
      accessorKey: "no",
      header: "#",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.index + 1}</span>
      ),
      enableSorting: false,
      size: 45,
    },
    {
      accessorKey: "transNo",
      header: "Trans #",
      cell: ({ row }) => {
        const label =
          row.original.transNo || `ADJ-${String(row.original.id).padStart(5, "0")}`;
        return (
          <button
            type="button"
            onClick={() => onView(row.original)}
            className="font-medium text-[#337ab7] hover:underline"
            title="View adjustment"
          >
            {label}
          </button>
        );
      },
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDateOnly(row.original.date, timezone)}
        </span>
      ),
    },
    {
      accessorKey: "locationName",
      header: "Location",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.locationName}</span>
      ),
    },
    {
      accessorKey: "productCode",
      header: "Product",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.productCode} — {row.original.productName}
        </span>
      ),
    },
    {
      accessorKey: "uomName",
      header: "UOM",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.uomName || "-"}</span>
      ),
    },
    {
      accessorKey: "qtyOld",
      header: () => <div className="text-right">Old Qty</div>,
      cell: ({ row }) => (
        <div className="text-right text-muted-foreground">
          {fmtQty(row.original.qtyOld)}
        </div>
      ),
    },
    {
      accessorKey: "qtyAdj",
      header: () => <div className="text-right">Adj Qty</div>,
      cell: ({ row }) => {
        const n = Number(row.original.qtyAdj);
        return (
          <div
            className={`text-right font-medium ${n < 0 ? "text-[#d9534f]" : "text-[#5cb85c]"}`}
          >
            {fmtAdj(row.original.qtyAdj)}
          </div>
        );
      },
    },
    {
      accessorKey: "qtyNew",
      header: () => <div className="text-right">New Qty</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">{fmtQty(row.original.qtyNew)}</div>
      ),
    },
    {
      accessorKey: "remarks",
      header: "Remarks",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.remarks || "-"}</span>
      ),
    },
    {
      accessorKey: "createdByDisplay",
      header: "Created By",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.createdByDisplay || "-"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={`inline-block px-2 py-0.5 text-xs font-medium ${statusBadge(row.original.status)}`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Action",
      enableSorting: false,
      size: 100,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onView(row.original)}
            title="View"
            className="inline-flex h-7 w-7 items-center justify-center bg-[#5cb85c] text-white hover:bg-[#449d44]"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          {row.original.status === "Completed" && (
            <button
              onClick={() => onCancel(row.original)}
              title="Cancel"
              className="inline-flex h-7 w-7 items-center justify-center bg-[#d9534f] text-white hover:bg-[#c9302c]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];
}

