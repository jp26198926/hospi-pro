"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Trash2, ArrowUpDown, RotateCcw } from "lucide-react";
import { formatDateOnly } from "@/lib/datetime";

export interface Location {
  id: number;
  name: string;
  status: "Active" | "Deleted";
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

interface ColumnActions {
  onView: (location: Location) => void;
  onEdit: (location: Location) => void;
  onDelete: (location: Location) => void;
  onRestore: (location: Location) => void;
  timezone: string;
}

export function getColumns({ onView, onEdit, onDelete, onRestore, timezone }: ColumnActions): ColumnDef<Location>[] {
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
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => (
        <span className="font-medium text-[#337ab7]">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Status
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <span
            className={`inline-block px-2 py-0.5 text-xs font-medium ${
              status === "Active"
                ? "bg-[#5cb85c] text-white"
                : "bg-[#999] text-white"
            }`}
          >
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Created At
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDateOnly(row.original.createdAt, timezone)}
        </span>
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
      id: "actions",
      header: "Actions",
      enableSorting: false,
      size: 120,
      cell: ({ row }) => {
        const location = row.original;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onView(location)}
              title="View"
              className="inline-flex h-7 w-7 items-center justify-center bg-[#5cb85c] text-white transition-colors hover:bg-[#449d44]"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onEdit(location)}
              title="Edit"
              className="inline-flex h-7 w-7 items-center justify-center bg-[#337ab7] text-white transition-colors hover:bg-[#286090]"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {location.status === "Active" ? (
              <button
                onClick={() => onDelete(location)}
                title="Delete"
                className="inline-flex h-7 w-7 items-center justify-center bg-[#d9534f] text-white transition-colors hover:bg-[#c9302c]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={() => onRestore(location)}
                title="Restore"
                className="inline-flex h-7 w-7 items-center justify-center bg-[#f0ad4e] text-white transition-colors hover:bg-[#ec971f]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      },
    },
  ];
}
