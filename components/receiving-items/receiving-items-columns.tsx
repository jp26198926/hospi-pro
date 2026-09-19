"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, RotateCcw } from "lucide-react";
import { formatDateOnly } from "@/lib/datetime";
import type { ReceivingStatus } from "@/components/receivings/receivings-columns";

export interface ReceivingItem {
  id: number;
  batchNo?: string;
  receivingId: number;
  productId: number;
  productCode: string;
  productName: string;
  uomId?: number | null;
  uomName?: string | null;
  qty: string;
  unitCost: string;
  totalCost: string;
  dateExpiry: Date | string | null;
  remarks: string | null;
  status: ReceivingStatus;
}

function fmtNum(v: string | number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toFixed(4);
}

export { fmtNum };

export function getReceivingItemColumns({
  masterStatus,
  timezone,
  onEdit,
  onCancel,
  onRestore,
}: {
  masterStatus: ReceivingStatus;
  timezone: string;
  onEdit: (item: ReceivingItem) => void;
  onCancel: (item: ReceivingItem) => void;
  onRestore: (item: ReceivingItem) => void;
}): ColumnDef<ReceivingItem>[] {
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
      accessorKey: "batchNo",
      header: "Batch No.",
      cell: ({ row }) => (
        <span className="font-medium text-[#337ab7]">
          {row.original.batchNo || `BATCH-${String(row.original.id).padStart(6, "0")}`}
        </span>
      ),
    },
    {
      accessorKey: "productCode",
      header: "Product Code",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.productCode}</span>
      ),
    },
    {
      accessorKey: "productName",
      header: "Product Name",
      cell: ({ row }) => <span>{row.original.productName}</span>,
    },
    {
      accessorKey: "uomName",
      header: "UOM",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.uomName || "-"}</span>
      ),
    },
    {
      accessorKey: "qty",
      header: () => <div className="text-right">Qty</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">{fmtNum(row.original.qty)}</div>
      ),
    },
    {
      accessorKey: "unitCost",
      header: () => <div className="text-right">Cost</div>,
      cell: ({ row }) => (
        <div className="text-right">{fmtNum(row.original.unitCost)}</div>
      ),
    },
    {
      accessorKey: "totalCost",
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => (
        <div className="text-right">{fmtNum(row.original.totalCost)}</div>
      ),
    },
    {
      accessorKey: "dateExpiry",
      header: "Expiry",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.dateExpiry
            ? formatDateOnly(row.original.dateExpiry, timezone)
            : "-"}
        </span>
      ),
    },
    {
      accessorKey: "remarks",
      header: "Remarks",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.remarks || "-"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <span
            className={`inline-block px-2 py-0.5 text-xs font-medium ${
              s === "Completed"
                ? "bg-[#5cb85c] text-white"
                : s === "Cancelled"
                  ? "bg-[#d9534f] text-white"
                  : "bg-[#f0ad4e] text-white"
            }`}
          >
            {s}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Action",
      enableSorting: false,
      size: 120,
      cell: ({ row }) => {
        const item = row.original;
        if (masterStatus !== "Draft") {
          return <span className="text-xs text-muted-foreground">-</span>;
        }
        return (
          <div className="flex items-center gap-1">
            {item.status === "Draft" && (
              <>
                <button
                  onClick={() => onEdit(item)}
                  title="Edit"
                  className="inline-flex h-7 w-7 items-center justify-center bg-[#337ab7] text-white hover:bg-[#286090]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onCancel(item)}
                  title="Cancel"
                  className="inline-flex h-7 w-7 items-center justify-center bg-[#d9534f] text-white hover:bg-[#c9302c]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {item.status === "Cancelled" && (
              <button
                onClick={() => onRestore(item)}
                title="Restore"
                className="inline-flex h-7 w-7 items-center justify-center bg-[#f0ad4e] text-white hover:bg-[#ec971f]"
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
