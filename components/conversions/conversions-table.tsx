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
  Plus,
  Search,
  FileDown,
  Loader2,
  Eye,
  Trash2,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatDateOnly } from "@/lib/datetime";
import {
  getConversionColumns,
  Conversion,
  fmtQty,
} from "./conversions-columns";
import { ConversionFormModal } from "./conversion-form-modal";
import { ConversionSearchModal } from "./conversion-search-modal";
import {
  ConversionViewModal,
  ConversionCancelModal,
} from "./conversion-view-cancel-modals";

interface ConversionsTableProps {
  timezone: string;
  appSettings?: {
    appName: string;
    appLogo: string | null;
    address: string | null;
    phone: string | null;
  };
}

export function ConversionsTable({ timezone, appSettings }: ConversionsTableProps) {
  const [data, setData] = useState<Conversion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [locationOptions, setLocationOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [formOpen, setFormOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewRow, setViewRow] = useState<Conversion | null>(null);
  const [cancelRow, setCancelRow] = useState<Conversion | null>(null);

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
        status: statusFilter,
      });
      if (search) params.set("search", search);
      if (locationFilter !== "all") params.set("locationId", locationFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/conversions?${params}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
        setTotal(json.total);
      }
    } catch (error) {
      console.error("Failed to fetch conversions:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sorting, search, statusFilter, locationFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns = getConversionColumns({
    onView: (row) => setViewRow(row),
    onCancel: (row) => setCancelRow(row),
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
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Conversions Report", 14, 20);

    autoTable(doc, {
      startY: 30,
      head: [
        [
          "#",
          "Trans #",
          "Date",
          "Location",
          "From Product",
          "From UOM",
          "From Qty",
          "To Product",
          "To UOM",
          "New Qty",
          "Remarks",
          "Created By",
          "Status",
        ],
      ],
      body: data.map((row, idx) => [
        idx + 1,
        row.transNo || `CNV-${String(row.id).padStart(5, "0")}`,
        formatDateOnly(row.date, timezone),
        row.locationName,
        `${row.fromProductCode} — ${row.fromProductName}`,
        row.fromUomName || "-",
        fmtQty(row.fromQty),
        `${row.toProductCode} — ${row.toProductName}`,
        row.toUomName || "-",
        fmtQty(row.newQty),
        row.remarks || "-",
        row.createdByDisplay || "-",
        row.status,
      ]),
      styles: { fontSize: 7 },
    });

    doc.save("conversions.pdf");
  };

  const exportExcel = () => {
    const worksheetData = data.map((row, idx) => ({
      "#": idx + 1,
      "Trans #": row.transNo || `CNV-${String(row.id).padStart(5, "0")}`,
      Date: formatDateOnly(row.date, timezone),
      Location: row.locationName,
      "From Product": `${row.fromProductCode} — ${row.fromProductName}`,
      "From UOM": row.fromUomName || "-",
      "From Qty": fmtQty(row.fromQty),
      "To Product": `${row.toProductCode} — ${row.toProductName}`,
      "To UOM": row.toUomName || "-",
      "New Qty": fmtQty(row.newQty),
      Remarks: row.remarks || "-",
      "Created By": row.createdByDisplay || "-",
      Status: row.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Conversions");
    XLSX.writeFile(workbook, "conversions.xlsx");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setFormOpen(true)}
            className="bg-[#5cb85c] text-white hover:bg-[#449d44]"
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
                  No conversions found.
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
                  onClick={() => setViewRow(item)}
                  className="text-xs font-medium text-[#337ab7] hover:underline"
                >
                  {item.transNo || `CNV-${String(item.id).padStart(5, "0")}`}
                </button>
                <span
                  className={`px-2 py-0.5 text-xs font-medium ${
                    item.status === "Cancelled"
                      ? "bg-[#d9534f] text-white"
                      : "bg-[#5cb85c] text-white"
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm font-semibold">
                  {item.fromProductCode} → {item.toProductCode}
                </p>
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  <p>Location: {item.locationName}</p>
                  <p>
                    Qty: {Number(item.fromQty).toFixed(4)} →{" "}
                    {Number(item.newQty).toFixed(4)}
                  </p>
                  <p>By: {item.createdByDisplay || "-"}</p>
                </div>
              </div>
              <div className="flex border-t border-[#eee]">
                <button
                  onClick={() => setViewRow(item)}
                  className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-[#5cb85c] hover:bg-[#5cb85c]/10"
                >
                  <Eye className="h-4 w-4" />
                  View
                </button>
                {item.status === "Completed" && (
                  <button
                    onClick={() => setCancelRow(item)}
                    className="flex flex-1 items-center justify-center gap-1.5 border-l border-[#eee] py-2.5 text-xs font-medium text-[#d9534f] hover:bg-[#d9534f]/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="border border-[#ddd] bg-white p-8 text-center text-sm text-muted-foreground">
            No conversions found.
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

      <ConversionFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchData}
      />
      <ConversionSearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        locationOptions={locationOptions}
        onSearch={(term, status, loc, from, to) => {
          setSearch(term);
          setStatusFilter(status);
          setLocationFilter(loc);
          setDateFrom(from);
          setDateTo(to);
          setPage(1);
        }}
      />
      <ConversionViewModal
        open={!!viewRow}
        onOpenChange={(o) => {
          if (!o) setViewRow(null);
        }}
        conversion={viewRow}
        timezone={timezone}
        appSettings={appSettings}
      />
      <ConversionCancelModal
        open={!!cancelRow}
        onOpenChange={(o) => {
          if (!o) setCancelRow(null);
        }}
        conversion={cancelRow}
        onSuccess={fetchData}
      />
    </div>
  );
}
