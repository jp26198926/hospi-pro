"use client";

import { ColumnDef } from "@tanstack/react-table";

export interface ReportInventoryRow {
  locationId: number;
  locationName: string;
  productId: number;
  productCode: string;
  productName: string;
  categoryName: string;
  uomCode: string;
  begBal: string;
  inQty: string;
  outQty: string;
  endBal: string;
}

function formatQty(v: string | number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toFixed(4);
}

export function getReportInventoryColumns(): ColumnDef<ReportInventoryRow>[] {
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
      accessorKey: "locationName",
      header: "Location",
    },
    {
      accessorKey: "productCode",
      header: "Product Code",
      cell: ({ row }) => (
        <span className="font-medium text-[#337ab7]">{row.original.productCode}</span>
      ),
    },
    {
      accessorKey: "productName",
      header: "Product Name",
    },
    {
      accessorKey: "categoryName",
      header: "Category",
      cell: ({ row }) => row.original.categoryName || "-",
    },
    {
      accessorKey: "uomCode",
      header: "UOM",
      cell: ({ row }) => row.original.uomCode || "-",
    },
    {
      accessorKey: "begBal",
      header: "Beg. Bal",
      cell: ({ row }) => (
        <span className="block text-right font-mono">{formatQty(row.original.begBal)}</span>
      ),
    },
    {
      accessorKey: "inQty",
      header: "In",
      cell: ({ row }) => (
        <span className="block text-right font-mono text-[#5cb85c]">
          {formatQty(row.original.inQty)}
        </span>
      ),
    },
    {
      accessorKey: "outQty",
      header: "Out",
      cell: ({ row }) => (
        <span className="block text-right font-mono text-[#d9534f]">
          {formatQty(row.original.outQty)}
        </span>
      ),
    },
    {
      accessorKey: "endBal",
      header: "End. Bal",
      cell: ({ row }) => (
        <span className="block text-right font-mono font-semibold">
          {formatQty(row.original.endBal)}
        </span>
      ),
    },
  ];
}
