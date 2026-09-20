"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Eye,
} from "lucide-react";
import { getColumns, Transfer } from "./transfers-columns";
import { TransferFormModal } from "./transfer-form-modal";
import { TransferSearchModal } from "./transfer-search-modal";

export function TransfersTable({ timezone }: { timezone: string }) {
  const router = useRouter();
  const [data, setData] = useState<Transfer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Draft");
  const [fromFilter, setFromFilter] = useState("all");
  const [toFilter, setToFilter] = useState("all");
  const [locationOptions, setLocationOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [formOpen, setFormOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    let cancelled = false;
    async function loadLocations() {
      try {
        const res = await fetch(
          "/api/locations?limit=100&status=Active&sortBy=name&sortOrder=asc"
        );
        const json = await res.json();
        if (!res.ok || cancelled) return;
        setLocationOptions(
          (json.data || []).map((r: { id: number; name: string }) => ({
            value: String(r.id),
            label: r.name,
          }))
        );
      } catch {
        // ignore
      }
    }
    loadLocations();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const sortBy = sorting[0]?.id || "date";
      const sortOrder = sorting[0]?.desc ? "desc" : "asc";
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
        status: statusFilter,
      });
      if (search) params.set("search", search);
      if (fromFilter !== "all") params.set("fromLocationId", fromFilter);
      if (toFilter !== "all") params.set("toLocationId", toFilter);

      const res = await fetch(`/api/transfers?${params}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
        setTotal(json.total);
      }
    } catch (error) {
      console.error("Failed to fetch transfers:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sorting, search, statusFilter, fromFilter, toFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns = getColumns({
    onView: (row) => router.push(`/transfers/${row.id}`),
    timezone,
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setFormOpen(true)}
            className="bg-[#337ab7] text-white hover:bg-[#286090]"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
          <Button
            variant="outline"
            onClick={() => setSearchOpen(true)}
            className="border-[#ccc]"
          >
            <Search className="h-4 w-4" />
            Advanced Search
          </Button>
        </div>
      </div>

      <div className="hidden overflow-hidden border border-[#ddd] md:block">
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
                  } hover:bg-[#f0f7ff]`}
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
                  No transfers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="flex items-center justify-center border border-[#ddd] bg-white p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length ? (
          data.map((item) => (
            <div key={item.id} className="border border-[#ddd] bg-white">
              <div className="flex items-center justify-between border-b border-[#eee] bg-[#f8f8f8] px-4 py-2">
                <button
                  type="button"
                  onClick={() => router.push(`/transfers/${item.id}`)}
                  className="text-xs font-medium text-[#337ab7] hover:underline"
                >
                  {item.transNo || `TRAN-${String(item.id).padStart(5, "0")}`}
                </button>
                <span
                  className={`px-2 py-0.5 text-xs font-medium ${
                    item.status === "Completed"
                      ? "bg-[#5cb85c] text-white"
                      : item.status === "Cancelled"
                        ? "bg-[#d9534f] text-white"
                        : "bg-[#f0ad4e] text-white"
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <div className="px-4 py-3">
                <div className="space-y-0.5 text-xs text-muted-foreground">
                  <p>From: {item.fromLocationName}</p>
                  <p>To: {item.toLocationName || "-"}</p>
                  <p>By: {item.createdByDisplay || "-"}</p>
                </div>
              </div>
              <div className="flex border-t border-[#eee]">
                <button
                  onClick={() => router.push(`/transfers/${item.id}`)}
                  className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-[#5cb85c] hover:bg-[#5cb85c]/10"
                >
                  <Eye className="h-4 w-4" />
                  View
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="border border-[#ddd] bg-white p-8 text-center text-sm text-muted-foreground">
            No transfers found.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Show</span>
          <Select
            value={String(limit)}
            onValueChange={(val) => {
              setLimit(Number(val));
              setPage(1);
            }}
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
            if (totalPages <= 5) pageNum = i + 1;
            else if (page <= 3) pageNum = i + 1;
            else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
            else pageNum = page - 2 + i;
            return (
              <Button
                key={pageNum}
                variant={page === pageNum ? "default" : "outline"}
                size="icon-sm"
                onClick={() => setPage(pageNum)}
                className={
                  page === pageNum
                    ? "bg-[#337ab7] text-white hover:bg-[#286090]"
                    : "border-[#ccc]"
                }
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

      <TransferFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        mode="add"
        transfer={null}
        onSuccess={fetchData}
      />
      <TransferSearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        locationOptions={locationOptions}
        onSearch={(term, status, from, to) => {
          setSearch(term);
          setStatusFilter(status);
          setFromFilter(from);
          setToFilter(to);
          setPage(1);
        }}
      />
    </div>
  );
}
