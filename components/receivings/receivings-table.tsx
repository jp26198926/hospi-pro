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
  FileDown,
  Loader2,
  Eye,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatDateOnly } from "@/lib/datetime";
import { getColumns, Receiving } from "./receivings-columns";
import { ReceivingFormModal } from "./receiving-form-modal";
import { ReceivingSearchModal } from "./receiving-search-modal";

export function ReceivingsTable({ timezone }: { timezone: string }) {
  const router = useRouter();
  const [data, setData] = useState<Receiving[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Draft");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [supplierOptions, setSupplierOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editRow, setEditRow] = useState<Receiving | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    let cancelled = false;
    async function loadSuppliers() {
      try {
        const res = await fetch(
          "/api/suppliers?limit=100&status=Active&sortBy=name&sortOrder=asc"
        );
        const json = await res.json();
        if (!res.ok || cancelled) return;
        setSupplierOptions(
          (json.data || []).map((r: { id: number; name: string }) => ({
            value: String(r.id),
            label: r.name,
          }))
        );
      } catch {
        // ignore
      }
    }
    loadSuppliers();
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
      });
      if (search) params.set("search", search);
      params.set("status", statusFilter);
      if (supplierFilter !== "all") params.set("supplierId", supplierFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/receivings?${params}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
        setTotal(json.total);
      }
    } catch (error) {
      console.error("Failed to fetch receivings:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sorting, search, statusFilter, supplierFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns = getColumns({
    onView: (row) => router.push(`/receivings/${row.id}`),
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

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Receivings Report", 14, 20);

    autoTable(doc, {
      startY: 30,
      head: [
        [
          "#",
          "Trans #",
          "Date",
          "Supplier",
          "PO No.",
          "Invoice No.",
          "Created By",
          "Status",
        ],
      ],
      body: data.map((row, idx) => [
        idx + 1,
        row.transNo || `RCV-${String(row.id).padStart(5, "0")}`,
        formatDateOnly(row.date, timezone),
        row.supplierName || "-",
        row.poNumber || "-",
        row.invoiceNumber || "-",
        row.createdByDisplay || "-",
        row.status,
      ]),
      styles: { fontSize: 8 },
    });

    doc.save("receivings.pdf");
  };

  const exportExcel = () => {
    const worksheetData = data.map((row, idx) => ({
      "#": idx + 1,
      "Trans #": row.transNo || `RCV-${String(row.id).padStart(5, "0")}`,
      Date: formatDateOnly(row.date, timezone),
      Supplier: row.supplierName || "-",
      "PO No.": row.poNumber || "-",
      "Invoice No.": row.invoiceNumber || "-",
      "Created By": row.createdByDisplay || "-",
      Status: row.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Receivings");
    XLSX.writeFile(workbook, "receivings.xlsx");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setFormMode("add");
              setEditRow(null);
              setFormOpen(true);
            }}
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
        <div className="flex w-full gap-2 sm:w-auto sm:items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={exportPDF}
            className="flex-1 border-[#ccc] sm:flex-none"
          >
            <FileDown className="h-4 w-4" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportExcel}
            className="flex-1 border-[#ccc] sm:flex-none"
          >
            <FileDown className="h-4 w-4" />
            Excel
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
                  No receivings found.
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
          data.map((item) => {
            const transNo =
              item.transNo || `RCV-${String(item.id).padStart(5, "0")}`;
            return (
              <div key={item.id} className="border border-[#ddd] bg-white">
                <div className="flex items-center justify-between border-b border-[#eee] bg-[#f8f8f8] px-4 py-2">
                  <span className="text-xs font-medium text-[#337ab7]">{transNo}</span>
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
                  <p className="text-sm font-semibold">{item.supplierName}</p>
                  <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    <p>PO: {item.poNumber || "-"}</p>
                    <p>Invoice: {item.invoiceNumber || "-"}</p>
                    <p>By: {item.createdByDisplay || item.createdByEmail || "-"}</p>
                  </div>
                </div>
                <div className="flex border-t border-[#eee]">
                  <button
                    onClick={() => router.push(`/receivings/${item.id}`)}
                    className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-[#5cb85c] hover:bg-[#5cb85c]/10"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="border border-[#ddd] bg-white p-8 text-center text-sm text-muted-foreground">
            No receivings found.
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

      <ReceivingFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        receiving={editRow}
        onSuccess={() => {
          fetchData();
        }}
      />
      <ReceivingSearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        supplierOptions={supplierOptions}
        onSearch={(term, status, supId, from, to) => {
          setSearch(term);
          setStatusFilter(status);
          setSupplierFilter(supId);
          setDateFrom(from);
          setDateTo(to);
          setPage(1);
        }}
      />
    </div>
  );
}
