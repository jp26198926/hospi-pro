"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Trash2, ArrowUpDown } from "lucide-react";

export interface RolePermission {
  id: number;
  roleId: number;
  pageId: number;
  pageName: string;
  permissionId: number;
  permissionName: string;
  createdAt: Date;
}

interface ColumnActions {
  onDelete: (rp: RolePermission) => void;
}

export function getColumns({ onDelete }: ColumnActions): ColumnDef<RolePermission>[] {
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
      accessorKey: "pageName",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Page
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => (
        <span className="font-medium text-[#337ab7]">{row.original.pageName}</span>
      ),
    },
    {
      accessorKey: "permissionName",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Permission
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => (
        <span className="font-medium text-[#337ab7]">{row.original.permissionName}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      size: 80,
      cell: ({ row }) => {
        const rp = row.original;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDelete(rp)}
              title="Delete"
              className="inline-flex h-7 w-7 items-center justify-center bg-[#d9534f] text-white transition-colors hover:bg-[#c9302c]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
    },
  ];
}
