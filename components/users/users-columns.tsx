"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Trash2, ArrowUpDown, RotateCcw, Key } from "lucide-react";

export interface UserRecord {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  departmentId: number | null;
  departmentName: string | null;
  roleId: number | null;
  roleName: string | null;
  status: "Active" | "Deleted";
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

interface ColumnActions {
  onView: (user: UserRecord) => void;
  onEdit: (user: UserRecord) => void;
  onDelete: (user: UserRecord) => void;
  onRestore: (user: UserRecord) => void;
  onChangePassword: (user: UserRecord) => void;
}

export function getColumns({ onView, onEdit, onDelete, onRestore, onChangePassword }: ColumnActions): ColumnDef<UserRecord>[] {
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
      accessorKey: "email",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Email
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => (
        <span className="font-medium text-[#337ab7]">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "firstname",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            First Name
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => (
        <span className="text-sm">{row.original.firstname}</span>
      ),
    },
    {
      accessorKey: "lastname",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-1 text-xs font-semibold uppercase text-[#666] hover:text-[#337ab7]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Last Name
            <ArrowUpDown className="h-3 w-3" />
          </button>
        );
      },
      cell: ({ row }) => (
        <span className="text-sm">{row.original.lastname}</span>
      ),
    },
    {
      accessorKey: "departmentName",
      header: "Department",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.departmentName || "-"}</span>
      ),
    },
    {
      accessorKey: "roleName",
      header: "Role",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.roleName || "-"}</span>
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
      id: "actions",
      header: "Actions",
      enableSorting: false,
      size: 180,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onView(user)}
              title="View"
              className="inline-flex h-7 w-7 items-center justify-center bg-[#5cb85c] text-white transition-colors hover:bg-[#449d44]"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onEdit(user)}
              title="Edit"
              className="inline-flex h-7 w-7 items-center justify-center bg-[#337ab7] text-white transition-colors hover:bg-[#286090]"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {user.status === "Active" ? (
              <button
                onClick={() => onDelete(user)}
                title="Delete"
                className="inline-flex h-7 w-7 items-center justify-center bg-[#d9534f] text-white transition-colors hover:bg-[#c9302c]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={() => onRestore(user)}
                title="Restore"
                className="inline-flex h-7 w-7 items-center justify-center bg-[#f0ad4e] text-white transition-colors hover:bg-[#ec971f]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => onChangePassword(user)}
              title="Change Password"
              className="inline-flex h-7 w-7 items-center justify-center bg-[#9b59b6] text-white transition-colors hover:bg-[#8e44ad]"
            >
              <Key className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
    },
  ];
}
