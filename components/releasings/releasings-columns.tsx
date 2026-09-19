"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Eye, ArrowUpDown } from "lucide-react";
import { formatDateOnly } from "@/lib/datetime";

export type ReleasingStatus = "Draft" | "Completed" | "Cancelled";

export interface Releasing {
  id: number;
  transNo?: string;
  date: Date | string;
  fromLocationId: number;
  fromLocationName: string;
  toLocationId: number | null;
  toLocationName: string | null;
  receiverName: string;
  remarks: string | null;
  status: ReleasingStatus;
  createdAt: Date | string;
  createdByDisplay?: string;
  createdByEmail?: string | null;
}

export function statusBadge(status: ReleasingStatus) {
  if (status === "Completed") return "bg-[#5cb85c] text-white";
  if (status === "Cancelled") return "bg-[#d9534f] text-white";
  return "bg-[#f0ad4e] text-white";
}

export function getColumns({
  onView,
  timezone,
}: {
  onView: (row: Releasing) => void;
  timezone: string;
}): ColumnDef<Releasing>[] {
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
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Trans #
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => {
        const label =
          row.original.transNo ||
          `RLS-${String(row.original.id).padStart(5, "0")}`;
        return (
          <button
            type="button"
            onClick={() => onView(row.original)}
            className="font-medium text-[#337ab7] hover:underline"
            title="View releasing"
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
      accessorKey: "fromLocationName",
      header: "From Location",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.fromLocationName}</span>
      ),
    },
    {
      accessorKey: "toLocationName",
      header: "To Location",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.toLocationName || "-"}
        </span>
      ),
    },
    {
      accessorKey: "receiverName",
      header: "Receiver",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.receiverName}</span>
      ),
    },
    {
      accessorKey: "remarks",
      header: "Remarks",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.remarks || "-"}
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
      size: 80,
      cell: ({ row }) => (
        <button
          onClick={() => onView(row.original)}
          title="View"
          className="inline-flex h-7 w-7 items-center justify-center bg-[#5cb85c] text-white hover:bg-[#449d44]"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];
}
