"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { formatDateTime } from "@/lib/datetime";

export interface StockMovement {
  id: number;
  date: Date;
  transTypeId: number;
  transTypeName: string;
  productId: number;
  productCode: string;
  productName: string;
  locationId: number;
  locationName: string | null;
  qty: string;
  referenceTransId: number | null;
  referenceItemId: number | null;
  referenceDescription: string | null;
  remarks: string | null;
  createdAt: Date;
  createdBy: number | null;
  createdByEmail: string | null;
}

export function formatQty(qty: string | number) {
  const n = Number(qty);
  if (!Number.isFinite(n)) return String(qty);
  const abs = Math.abs(n).toFixed(4).replace(/\.?0+$/, "") || "0";
  return n < 0 ? `-${abs}` : `+${abs}`;
}

export function getColumns({
  timezone,
}: {
  timezone: string;
}): ColumnDef<StockMovement>[] {
  return [
    {
      accessorKey: "no",
      header: "#",
      cell: ({ row }) => {
        return <span className="text-muted-foreground">{row.index + 1}</span>;
      },
      enableSorting: false,
      size: 50,
    },
    {
      accessorKey: "transTypeName",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Trans Type
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.transTypeName}</span>
      ),
    },
    {
      accessorKey: "date",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDateTime(row.original.date, timezone)}
        </span>
      ),
    },
    {
      accessorKey: "productCode",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Product Code
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-medium text-[#337ab7]">{row.original.productCode}</span>
      ),
    },
    {
      accessorKey: "productName",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Product Name
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.productName}</span>
      ),
    },
    {
      accessorKey: "qty",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          QTY
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => {
        const n = Number(row.original.qty);
        return (
          <span
            className={`font-medium ${n < 0 ? "text-[#d9534f]" : "text-[#5cb85c]"}`}
          >
            {formatQty(row.original.qty)}
          </span>
        );
      },
    },
    {
      accessorKey: "locationName",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Location
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.locationName || "-"}</span>
      ),
    },
    {
      accessorKey: "referenceDescription",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Reference
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.referenceDescription || "-"}
        </span>
      ),
    },
    {
      accessorKey: "remarks",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Remarks
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.remarks || "-"}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created At
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDateTime(row.original.createdAt, timezone)}
        </span>
      ),
    },
    {
      accessorKey: "createdByEmail",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created By
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.createdByEmail || "-"}
        </span>
      ),
    },
  ];
}
