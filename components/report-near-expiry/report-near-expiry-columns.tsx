"use client";

import { ColumnDef } from "@tanstack/react-table";

export interface ReportNearExpiryRow {
  id: number;
  locationId: number;
  locationName: string;
  productId: number;
  productCode: string;
  productName: string;
  categoryName: string;
  uomCode: string;
  batchNo: string;
  expiry: string;
  daysLeft: number;
  qty: string;
  status: "Expired" | "Near Expiry";
}

function formatQty(v: string | number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toFixed(4);
}

export function getReportNearExpiryColumns(): ColumnDef<ReportNearExpiryRow>[] {
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
    { accessorKey: "batchNo", header: "Batch No" },
    { accessorKey: "expiry", header: "Expiry" },
    {
      accessorKey: "daysLeft",
      header: "Days Left",
      cell: ({ row }) => (
        <span
          className={`block text-right font-mono ${
            row.original.daysLeft < 0 ? "text-[#d9534f]" : "text-[#f0ad4e]"
          }`}
        >
          {row.original.daysLeft}
        </span>
      ),
    },
    {
      accessorKey: "qty",
      header: "Qty",
      cell: ({ row }) => (
        <span className="block text-right font-mono">{formatQty(row.original.qty)}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={`inline-block px-2 py-0.5 text-xs font-medium ${
            row.original.status === "Expired"
              ? "bg-[#d9534f] text-white"
              : "bg-[#f0ad4e] text-white"
          }`}
        >
          {row.original.status}
        </span>
      ),
    },
  ];
}
