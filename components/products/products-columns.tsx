"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Trash2, ArrowUpDown, RotateCcw } from "lucide-react";
import { formatDateTime } from "@/lib/datetime";

export interface Product {
  id: number;
  code: string;
  name: string;
  categoryId: number | null;
  categoryName: string | null;
  brand: string | null;
  model: string | null;
  minStock: string;
  stock: string;
  lastCost: string;
  avgCost: string;
  status: "Active" | "Deleted";
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
  createdBy: number | null;
  updatedBy: number | null;
  deletedBy: number | null;
  deletedReason: string | null;
}

interface ColumnActions {
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onRestore: (product: Product) => void;
  timezone: string;
}

export function getColumns({ onView, onEdit, onDelete, onRestore, timezone }: ColumnActions): ColumnDef<Product>[] {
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
      accessorKey: "code",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Code
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => (
        <span className="font-mono font-medium text-[#337ab7]">{row.original.code}</span>
      ),
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
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "categoryName",
      header: "Category",
      cell: ({ row }) => (
        <span>{row.original.categoryName || "-"}</span>
      ),
    },
    {
      accessorKey: "brand",
      header: "Brand",
      cell: ({ row }) => (
        <span>{row.original.brand || "-"}</span>
      ),
    },
    {
      accessorKey: "stock",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Stock
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => (
        <span>{Number(row.original.stock).toFixed(4)}</span>
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
          {formatDateTime(row.original.createdAt, timezone)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      size: 120,
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onView(product)}
              title="View"
              className="inline-flex h-7 w-7 items-center justify-center bg-[#5cb85c] text-white transition-colors hover:bg-[#449d44]"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onEdit(product)}
              title="Edit"
              className="inline-flex h-7 w-7 items-center justify-center bg-[#337ab7] text-white transition-colors hover:bg-[#286090]"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {product.status === "Active" ? (
              <button
                onClick={() => onDelete(product)}
                title="Delete"
                className="inline-flex h-7 w-7 items-center justify-center bg-[#d9534f] text-white transition-colors hover:bg-[#c9302c]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={() => onRestore(product)}
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
