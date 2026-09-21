"use client";

import { ColumnDef } from "@tanstack/react-table";

export interface ReportLowStockRow {
  locationId: number;
  locationName: string;
  productId: number;
  productCode: string;
  productName: string;
  categoryName: string;
  uomCode: string;
  minStock: string;
  onHand: string;
  shortage: string;
}

function formatQty(v: string | number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toFixed(4);
}

export function getReportLowStockColumns(): ColumnDef<ReportLowStockRow>[] {
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
    { accessorKey: "locationName", header: "Location" },
    {
      accessorKey: "productCode",
      header: "Product Code",
      cell: ({ row }) => (
        <span className="font-medium text-[#337ab7]">{row.original.productCode}</span>
      ),
    },
    { accessorKey: "productName", header: "Product Name" },
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
      accessorKey: "minStock",
      header: "Min Stock",
      cell: ({ row }) => (
        <span className="block text-right font-mono">{formatQty(row.original.minStock)}</span>
      ),
    },
    {
      accessorKey: "onHand",
      header: "On Hand",
      cell: ({ row }) => (
        <span className="block text-right font-mono text-[#d9534f]">
          {formatQty(row.original.onHand)}
        </span>
      ),
    },
    {
      accessorKey: "shortage",
      header: "Shortage",
      cell: ({ row }) => (
        <span className="block text-right font-mono font-semibold">
          {formatQty(row.original.shortage)}
        </span>
      ),
    },
  ];
}
