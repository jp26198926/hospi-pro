"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Eye, ArrowUpDown } from "lucide-react";
import { formatDateOnly } from "@/lib/datetime";

export type ReceivingStatus = "Draft" | "Completed" | "Cancelled";

export interface Receiving {
  id: number;
  transNo?: string;
  date: Date | string;
  supplierId: number;
  supplierName: string;
  locationId: number;
  poNumber: string | null;
  invoiceNumber: string | null;
  remarks: string | null;
  status: ReceivingStatus;
  createdAt: Date | string;
  createdByEmail: string | null;
  createdByDisplay?: string;
}

export function statusBadge(status: ReceivingStatus) {
  if (status === "Completed") return "bg-[#5cb85c] text-white";
  if (status === "Cancelled") return "bg-[#d9534f] text-white";
  return "bg-[#f0ad4e] text-white";
}

export function getColumns({
  onView,
  timezone,
}: {
  onView: (row: Receiving) => void;
  timezone: string;
}): ColumnDef<Receiving>[] {
  return [
    {
      accessorKey: "no",
      header: "#",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.index + 1}</span>
      ),
      enableSorting: false,
      size: 50,
    },
    {
      accessorKey: "transNo",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Trans #
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-medium text-[#337ab7]">
          {row.original.transNo || `RCV-${String(row.original.id).padStart(5, "0")}`}
        </span>
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
          {formatDateOnly(row.original.date, timezone)}
        </span>
      ),
    },
    {
      accessorKey: "supplierName",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Supplier
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.supplierName}</span>
      ),
    },
    {
      accessorKey: "poNumber",
      header: "PO No.",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.poNumber || "-"}</span>
      ),
    },
    {
      accessorKey: "invoiceNumber",
      header: "Invoice No.",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.invoiceNumber || "-"}
        </span>
      ),
    },
    {
      accessorKey: "createdByDisplay",
      header: "Created By",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.createdByDisplay || row.original.createdByEmail || "-"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
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
      size: 90,
      cell: ({ row }) => (
        <button
          onClick={() => onView(row.original)}
          title="View"
          className="inline-flex h-7 w-7 items-center justify-center bg-[#5cb85c] text-white transition-colors hover:bg-[#449d44]"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];
}
