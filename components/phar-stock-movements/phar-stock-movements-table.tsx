"use client";

import { useState, useEffect, useCallback } from "react";
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
  Search,
  FileDown,
  Loader2,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatDateOnly } from "@/lib/datetime";
import {
  getColumns,
  StockMovement,
  formatQty,
} from "@/components/stock-movements/stock-movements-columns";
import { PharStockMovementSearchModal } from "./phar-stock-movement-search-modal";

interface SelectOption {
  value: string;
  label: string;
}

export function PharStockMovementsTable({ timezone }: { timezone: string }) {
  const [data, setData] = useState<StockMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [transTypeFilter, setTransTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [transTypeOptions, setTransTypeOptions] = useState<SelectOption[]>([]);

  const totalPages = Math.ceil(total / limit) || 1;

  useEffect(() => {
    let cancelled = false;
    async function loadTransTypes() {
      try {
        const res = await fetch(
          "/api/trans-types?limit=100&status=Active&sortBy=name&sortOrder=asc"
        );
        const json = await res.json();
        if (!res.ok || cancelled) return;
        setTransTypeOptions(
          (json.data || []).map((r: { id: number; name: string }) => ({
            value: String(r.id),
            label: r.name,
          }))
        );
      } catch {
        // empty
      }
    }
    loadTransTypes();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const sortBy = sorting[0]?.id || "date";
      const sortOrder = sorting[0]
        ? sorting[0].desc
          ? "desc"
          : "asc"
        : "desc";
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });
      if (search) params.set("search", search);
      if (transTypeFilter !== "all") params.set("transTypeId", transTypeFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/phar-stock-movements?${params}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
        setTotal(json.total);
      }
    } catch (error) {
      console.error("Failed to fetch pharmacy stock movements:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sorting, search, transTypeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns = getColumns({ timezone });
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
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Phar Stock Movement Report", 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [
        [
          "#",
          "Trans Type",
          "Date",
          "Product Code",
          "Product Name",
          "QTY",
          "Location",
          "Reference",
          "Remarks",
          "Created At",
          "Created By",
        ],
      ],
      body: data.map((item, idx) => [
        idx + 1,
        item.transTypeName,
        formatDateOnly(item.date, timezone),
        item.productCode,
        item.productName,
        formatQty(item.qty),
        item.locationName || "-",
        item.referenceDescription || "-",
        item.remarks || "-",
        formatDateOnly(item.createdAt, timezone),
        item.createdByDisplay || item.createdByEmail || "-",
      ]),
      styles: { fontSize: 7 },
    });
    doc.save("phar-stock-movements.pdf");
  };

  const exportExcel = () => {
    const worksheetData = data.map((item, idx) => ({
      "#": idx + 1,
      "Trans Type": item.transTypeName,
      Date: formatDateOnly(item.date, timezone),
      "Product Code": item.productCode,
      "Product Name": item.productName,
      QTY: Number(item.qty) || 0,
      Location: item.locationName || "-",
      Reference: item.referenceDescription || "-",
      Remarks: item.remarks || "-",
      "Created At": formatDateOnly(item.createdAt, timezone),
      "Created By": item.createdByDisplay || item.createdByEmail || "-",
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Phar Stock Movements");
    XLSX.writeFile(workbook, "phar-stock-movements.xlsx");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setSearchModalOpen(true)}
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
              <TableRow key={headerGroup.id} className="border-b border-[#ddd] bg-[#f2f2f2]">
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
                  No pharmacy stock movements found.
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
          data.map((item, index) => (
            <div key={item.id} className="border border-[#ddd] bg-white">
              <div className="flex items-center justify-between border-b border-[#eee] bg-[#f8f8f8] px-4 py-2">
                <span className="text-xs font-medium text-[#337ab7]">
                  {item.transTypeName}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs font-medium ${
                    Number(item.qty) < 0
                      ? "bg-[#d9534f] text-white"
                      : "bg-[#5cb85c] text-white"
                  }`}
                >
                  {formatQty(item.qty)}
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-[#337ab7]">{item.productCode}</p>
                <p className="text-sm">{item.productName}</p>
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  <p>Date: {formatDateOnly(item.date, timezone)}</p>
                  <p>Ref: {item.referenceDescription || "-"}</p>
                  <p>By: {item.createdByDisplay || item.createdByEmail || "-"}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="border border-[#ddd] bg-white p-8 text-center text-sm text-muted-foreground">
            No pharmacy stock movements found.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Show</span>
          <Select
            value={String(limit)}
            onValueChange={(val) => {
              setLimit(Number(val ?? "20"));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[70px] border-[#ccc]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[20, 25, 50, 100].map((n) => (
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

      <PharStockMovementSearchModal
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        transTypeOptions={transTypeOptions}
        onSearch={(term, ttId, from, to) => {
          setSearch(term);
          setTransTypeFilter(ttId);
          setDateFrom(from);
          setDateTo(to);
          setPage(1);
        }}
      />
    </div>
  );
}
