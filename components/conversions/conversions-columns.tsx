"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Eye, Trash2 } from "lucide-react";
import { formatDateOnly } from "@/lib/datetime";

export type ConversionStatus = "Completed" | "Cancelled";

export interface Conversion {
  id: number;
  transNo?: string;
  date: Date | string;
  locationId: number;
  locationName: string;
  fromProductId: number;
  fromProductCode: string;
  fromProductName: string;
  fromUomName?: string | null;
  fromQty: string;
  toProductId: number;
  toProductCode: string;
  toProductName: string;
  toUomName?: string | null;
  newQty: string;
  remarks: string | null;
  status: ConversionStatus;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
  deletedAt?: Date | string | null;
  deletedReason?: string | null;
  createdByDisplay?: string | null;
  updatedByDisplay?: string | null;
  deletedByDisplay?: string | null;
}

function fmtQty(v: string | number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toFixed(4);
}

export function statusBadge(status: ConversionStatus) {
  if (status === "Cancelled") return "bg-[#d9534f] text-white";
  return "bg-[#5cb85c] text-white";
}

export function getConversionColumns({
  onView,
  onCancel,
  timezone,
}: {
  onView: (row: Conversion) => void;
  onCancel: (row: Conversion) => void;
  timezone: string;
}): ColumnDef<Conversion>[] {
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
          row.original.transNo ||
          `CNV-${String(row.original.id).padStart(5, "0")}`;
        return (
          <button
            type="button"
            onClick={() => onView(row.original)}
            className="font-medium text-[#337ab7] hover:underline"
            title="View conversion"
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
      accessorKey: "fromProductCode",
      header: "From Product",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.fromProductCode} — {row.original.fromProductName}
        </span>
      ),
    },
    {
      accessorKey: "fromUomName",
      header: "From UOM",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.fromUomName || "-"}</span>
      ),
    },
    {
      accessorKey: "fromQty",
      header: () => <div className="text-right">From Qty</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium text-[#d9534f]">
          {fmtQty(row.original.fromQty)}
        </div>
      ),
    },
    {
      accessorKey: "toProductCode",
      header: "To Product",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.toProductCode} — {row.original.toProductName}
        </span>
      ),
    },
    {
      accessorKey: "toUomName",
      header: "To UOM",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.toUomName || "-"}</span>
      ),
    },
    {
      accessorKey: "newQty",
      header: () => <div className="text-right">To Qty</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium text-[#5cb85c]">
          {fmtQty(row.original.newQty)}
        </div>
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

export { fmtQty };
