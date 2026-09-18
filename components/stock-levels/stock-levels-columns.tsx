"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { formatDateOnly } from "@/lib/datetime";

export interface StockLevel {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  locationId: number;
  locationName: string | null;
  qty: string;
  updatedAt: Date | null;
  updatedBy: number | null;
  updatedByEmail: string | null;
  updatedByDisplay?: string;
}

function formatQty(qty: string | number) {
  const n = Number(qty);
  if (!Number.isFinite(n)) return String(qty);
  return n.toFixed(4).replace(/\.?0+$/, "") || "0";
}

export function getColumns({
  timezone,
}: {
  timezone: string;
}): ColumnDef<StockLevel>[] {
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
      accessorKey: "productCode",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Product Code
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => (
        <span className="font-medium text-[#337ab7]">{row.original.productCode}</span>
      ),
    },
    {
      accessorKey: "productName",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Product Name
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => (
        <span className="font-medium">{row.original.productName}</span>
      ),
    },
    {
      accessorKey: "qty",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            QTY
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => (
        <span className="font-medium">{formatQty(row.original.qty)}</span>
      ),
    },
    {
      accessorKey: "locationName",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Location
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => (
        <span className="font-medium">{row.original.locationName || "-"}</span>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Updated At
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.updatedAt
            ? formatDateOnly(row.original.updatedAt, timezone)
            : "-"}
        </span>
      ),
    },
    {
      accessorKey: "updatedByDisplay",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Updated By
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.updatedByDisplay || row.original.updatedByEmail || "-"}
        </span>
      ),
    },
  ];
}

export { formatQty };
