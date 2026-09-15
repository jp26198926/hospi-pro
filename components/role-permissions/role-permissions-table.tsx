"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  SortingState,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { getColumns, RolePermission } from "./role-permissions-columns";
import { RolePermissionAddModal } from "./role-permission-add-modal";
import { RolePermissionSearchModal } from "./role-permission-search-modal";

interface RolePermissionsTableProps {
  roleId: number;
}

export function RolePermissionsTable({ roleId }: RolePermissionsTableProps) {
  const [data, setData] = useState<RolePermission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [loading, setLoading] = useState(true);
  const [searchPageId, setSearchPageId] = useState("all");
  const [searchPermissionId, setSearchPermissionId] = useState("all");

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const totalPages = Math.ceil(total / limit);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const sortBy = sorting[0]?.id || "createdAt";
      const sortOrder = sorting[0]?.desc ? "desc" : "asc";
      const params = new URLSearchParams({
        roleId: String(roleId),
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });
      if (searchPageId !== "all") params.set("searchPage", searchPageId);
      if (searchPermissionId !== "all") params.set("searchPermission", searchPermissionId);

      const res = await fetch(`/api/role-permissions?${params}`);
      const json = await res.json();

      if (res.ok) {
        setData(json.data);
        setTotal(json.total);
      }
    } catch (error) {
      console.error("Failed to fetch role permissions:", error);
    } finally {
      setLoading(false);
    }
  }, [roleId, page, limit, sorting, searchPageId, searchPermissionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (rp: RolePermission) => {
    try {
      const res = await fetch(`/api/role-permissions/${rp.id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Failed to delete");
        return;
      }

      toast.success("Permission removed successfully");
      fetchData();
    } catch {
      toast.error("An unexpected error occurred");
    }
    setDeleteConfirmId(null);
  };

  const handleSuccess = () => {
    fetchData();
  };

  const columns = getColumns({
    onDelete: (rp) => setDeleteConfirmId(rp.id),
  });

  const table = useReactTable({
    data,
    columns,
    pageCount: totalPages,
    state: { sorting, pagination: { pageIndex: page - 1, pageSize: limit } },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => setAddModalOpen(true)}
          className="bg-[#337ab7] text-white hover:bg-[#286090]"
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
        <Button variant="outline" onClick={() => setSearchModalOpen(true)} className="border-[#ccc]">
          <Search className="h-4 w-4" />
          Advanced Search
        </Button>
      </div>

      {/* Table — desktop only */}
      <div className="hidden overflow-hidden border border-[#ddd] md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-[#ddd] bg-[#f2f2f2]">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="border-r border-[#eee] text-xs font-semibold uppercase text-[#666] last:border-r-0">
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
                <TableRow key={row.id} className={`border-b border-[#eee] ${index % 2 === 0 ? "bg-white" : "bg-[#fafafa]"} hover:bg-[#f0f7ff]`}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="border-r border-[#eee] py-2.5 text-sm last:border-r-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No page permissions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Cards — mobile only */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="flex items-center justify-center border border-[#ddd] bg-white p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length ? (
          data.map((rp, index) => (
            <div key={rp.id} className="border border-[#ddd] bg-white">
              <div className="flex items-center justify-between border-b border-[#eee] bg-[#f8f8f8] px-4 py-2">
                <span className="text-xs text-muted-foreground">#{index + 1}</span>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm"><span className="font-medium text-[#666]">Page:</span> <span className="text-[#337ab7]">{rp.pageName}</span></p>
                <p className="mt-1 text-sm"><span className="font-medium text-[#666]">Permission:</span> <span className="text-[#337ab7]">{rp.permissionName}</span></p>
              </div>
              <div className="flex border-t border-[#eee]">
                <button
                  onClick={() => setDeleteConfirmId(rp.id)}
                  className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-[#d9534f] transition-colors hover:bg-[#d9534f]/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="border border-[#ddd] bg-white p-8 text-center text-sm text-muted-foreground">
            No page permissions found.
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Show</span>
          <Select
            value={String(limit)}
            onValueChange={(val) => { setLimit(Number(val)); setPage(1); }}
          >
            <SelectTrigger className="h-8 w-[70px] border-[#ccc]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>of {total} entries</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="border-[#ccc]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }
            return (
              <Button
                key={pageNum}
                variant={page === pageNum ? "default" : "outline"}
                size="icon-sm"
                onClick={() => setPage(pageNum)}
                className={page === pageNum ? "bg-[#337ab7] text-white hover:bg-[#286090]" : "border-[#ccc]"}
              >
                {pageNum}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="border-[#ccc]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Inline */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-sm border border-[#ddd] bg-white p-0">
            <div className="flex items-center justify-between border-b border-[#ddd] bg-[#d9534f] px-4 py-3">
              <span className="text-sm font-semibold text-white">Confirm Delete</span>
              <button onClick={() => setDeleteConfirmId(null)} className="text-white/70 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-[#333]">Are you sure you want to remove this page permission? This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#eee] bg-[#f8f8f8] px-4 py-3">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="border-[#ccc] bg-white text-[#333] hover:bg-[#f5f5f5]">
                Cancel
              </Button>
              <Button onClick={() => { const rp = data.find((d) => d.id === deleteConfirmId); if (rp) handleDelete(rp); }} className="bg-[#d9534f] text-white hover:bg-[#c9302c]">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <RolePermissionAddModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        roleId={roleId}
        onSuccess={handleSuccess}
      />
      <RolePermissionSearchModal
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        onSearch={(pageId, permId) => { setSearchPageId(pageId); setSearchPermissionId(permId); setPage(1); }}
      />
    </div>
  );
}
