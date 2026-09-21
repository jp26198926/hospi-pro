"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import {
  getReleasingItemColumns,
  ReleasingItem,
} from "./releasing-items-columns";
import { ReleasingItemFormModal } from "./releasing-item-form-modal";
import { ReleasingItemActionModal } from "./releasing-item-action-modal";
import type { ReleasingStatus } from "@/components/releasings/releasings-columns";

interface ReleasingItemsTableProps {
  releasingId: number;
  masterStatus: ReleasingStatus;
  locationId: number | null;
  timezone: string;
  onMutated?: () => void;
  reloadKey?: number;
}

export function ReleasingItemsTable({
  releasingId,
  masterStatus,
  locationId,
  timezone,
  onMutated,
  reloadKey = 0,
}: ReleasingItemsTableProps) {
  const [data, setData] = useState<ReleasingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelled, setShowCancelled] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editItem, setEditItem] = useState<ReleasingItem | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionKind, setActionKind] = useState<"cancel" | "restore">("cancel");
  const [actionItem, setActionItem] = useState<ReleasingItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        releasingId: String(releasingId),
        limit: "100",
        sortBy: "id",
        sortOrder: "asc",
      });
      if (showCancelled) params.set("showCancelled", "true");
      const res = await fetch(`/api/releasing-items?${params}`);
      const json = await res.json();
      if (res.ok) setData(json.data);
    } catch (error) {
      console.error("Failed to fetch releasing items:", error);
    } finally {
      setLoading(false);
    }
  }, [releasingId, showCancelled]);

  useEffect(() => {
    fetchData();
  }, [fetchData, reloadKey]);

  const columns = getReleasingItemColumns({
    masterStatus,
    timezone,
    onEdit: (item) => {
      setEditItem(item);
      setFormMode("edit");
      setFormOpen(true);
    },
    onCancel: (item) => {
      setActionItem(item);
      setActionKind("cancel");
      setActionOpen(true);
    },
    onRestore: (item) => {
      setActionItem(item);
      setActionKind("restore");
      setActionOpen(true);
    },
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#333]">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(e) => setShowCancelled(e.target.checked)}
            className="h-4 w-4 accent-[#337ab7]"
          />
          Show cancelled items
        </label>
        {masterStatus === "Draft" && (
          <Button
            onClick={() => {
              setFormMode("add");
              setEditItem(null);
              setFormOpen(true);
            }}
            className="bg-[#337ab7] text-white hover:bg-[#286090]"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        )}
      </div>

      <div className="overflow-x-auto border border-[#ddd]">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-[#ddd] bg-[#f2f2f2]"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="border-r border-[#eee] text-xs font-semibold uppercase text-[#666] last:border-r-0"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  className={`border-b border-[#eee] ${
                    index % 2 === 0 ? "bg-white" : "bg-[#fafafa]"
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="border-r border-[#eee] py-2.5 text-sm last:border-r-0"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No items found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ReleasingItemFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        releasingId={releasingId}
        locationId={locationId}
        item={editItem}
        onSuccess={() => {
          fetchData();
          onMutated?.();
        }}
      />
      <ReleasingItemActionModal
        open={actionOpen}
        onOpenChange={setActionOpen}
        action={actionKind}
        item={actionItem}
        onSuccess={() => {
          fetchData();
          onMutated?.();
        }}
      />
    </div>
  );
}
