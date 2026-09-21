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
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileText,
  Loader2,
  RotateCcw,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  drawCompanyHeader,
  type PrintAppSettings,
} from "@/lib/print/document-print";
import {
  getReportInventoryColumns,
  ReportInventoryRow,
} from "./report-inventory-columns";

interface SelectOption {
  value: string;
  label: string;
}

interface ReportInventoryTableProps {
  timezone: string;
  appSettings?: PrintAppSettings;
}

export function ReportInventoryTable({ timezone, appSettings }: ReportInventoryTableProps) {
  void timezone;
  const [data, setData] = useState<ReportInventoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");

  const [applied, setApplied] = useState<{
    dateFrom: string;
    dateTo: string;
    locationFilter: string;
    categoryFilter: string;
    productFilter: string;
  } | null>(null);

  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [productOptions, setProductOptions] = useState<SelectOption[]>([]);

  const totalPages = Math.ceil(total / limit) || 1;

  useEffect(() => {
    let cancelled = false;
    async function loadLookups() {
      try {
        const [locRes, catRes, prodRes] = await Promise.all([
          fetch("/api/locations?limit=100&status=Active&sortBy=name&sortOrder=asc"),
          fetch("/api/categories?limit=100&status=Active&sortBy=name&sortOrder=asc"),
          fetch("/api/products?limit=100&status=Active&sortBy=code&sortOrder=asc"),
        ]);
        if (cancelled) return;
        if (locRes.ok) {
          const json = await locRes.json();
          setLocationOptions(
            (json.data || []).map((r: { id: number; name: string }) => ({
              value: String(r.id),
              label: r.name,
            }))
          );
        }
        if (catRes.ok) {
          const json = await catRes.json();
          setCategoryOptions(
            (json.data || []).map((r: { id: number; name: string }) => ({
              value: String(r.id),
              label: r.name,
            }))
          );
        }
        if (prodRes.ok) {
          const json = await prodRes.json();
          setProductOptions(
            (json.data || []).map(
              (r: { id: number; code: string; name: string }) => ({
                value: String(r.id),
                label: `${r.code} — ${r.name}`,
              })
            )
          );
        }
      } catch {
        // filters stay empty
      }
    }
    loadLookups();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchReport = useCallback(async () => {
    if (!applied) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (applied.dateFrom) params.set("dateFrom", applied.dateFrom);
      if (applied.dateTo) params.set("dateTo", applied.dateTo);
      if (applied.locationFilter !== "all") params.set("locationId", applied.locationFilter);
      if (applied.categoryFilter !== "all") params.set("categoryId", applied.categoryFilter);
      if (applied.productFilter !== "all") params.set("productId", applied.productFilter);

      const res = await fetch(`/api/report-inventory?${params}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.data || []);
        setTotal(json.total || 0);
      } else {
        setData([]);
        setTotal(0);
        toast.error(json.error || "Failed to load inventory report");
      }
    } catch {
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setGenerated(true);
    }
  }, [page, limit, applied]);

  // Fetch only after Generate (applied filters) or when page/limit change after a run
  useEffect(() => {
    if (!applied) return;
    void fetchReport();
  }, [fetchReport, applied]);

  const handleGenerate = () => {
    setApplied({
      dateFrom,
      dateTo,
      locationFilter,
      categoryFilter,
      productFilter,
    });
    setPage(1);
  };

  const handleReset = () => {
    setDateFrom("");
    setDateTo("");
    setLocationFilter("all");
    setCategoryFilter("all");
    setProductFilter("all");
    setPage(1);
    setApplied(null);
    setData([]);
    setTotal(0);
    setGenerated(false);
  };

  const columns = getReportInventoryColumns();

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

  const exportRows = () => data;

  const exportPDF = async () => {
    const rows = exportRows();
    const doc = new jsPDF({ orientation: "landscape" });
    const period =
      applied?.dateFrom || applied?.dateTo
        ? `Period: ${applied?.dateFrom || "…"} to ${applied?.dateTo || "…"}`
        : "Period: All dates";

    const startY = await drawCompanyHeader(doc, appSettings, {
      margin: 14,
      rightTitle: "Inventory Report",
      rightTop: period,
    });

    autoTable(doc, {
      startY,
      head: [
        [
          "#",
          "Location",
          "Product Code",
          "Product Name",
          "Category",
          "UOM",
          "Beg. Bal",
          "In",
          "Out",
          "End. Bal",
        ],
      ],
      body: rows.map((r, idx) => [
        idx + 1,
        r.locationName,
        r.productCode,
        r.productName,
        r.categoryName || "-",
        r.uomCode || "-",
        r.begBal,
        r.inQty,
        r.outQty,
        r.endBal,
      ]),
      styles: { fontSize: 7 },
    });
    doc.save("report-inventory.pdf");
  };

  const exportExcel = () => {
    const rows = exportRows();
    const worksheetData = rows.map((r, idx) => ({
      "#": idx + 1,
      Location: r.locationName,
      "Product Code": r.productCode,
      "Product Name": r.productName,
      Category: r.categoryName || "-",
      UOM: r.uomCode || "-",
      "Beg. Bal": r.begBal,
      In: r.inQty,
      Out: r.outQty,
      "End. Bal": r.endBal,
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Report");
    XLSX.writeFile(workbook, "report-inventory.xlsx");
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-sm border border-[#ddd]">
        <div className="border-b border-[#ddd] bg-[#337ab7] px-4 py-2.5">
          <h3 className="text-sm font-semibold text-white">Report Filters</h3>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">Date From</Label>
              <DatePicker
                value={dateFrom}
                onValueChange={setDateFrom}
                placeholder="Optional — blank for all"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">Date To</Label>
              <DatePicker
                value={dateTo}
                onValueChange={setDateTo}
                placeholder="Optional — blank for all"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">Location</Label>
              <SearchableSelect
                options={locationOptions}
                value={locationFilter}
                onValueChange={setLocationFilter}
                allOption
                allLabel="All Locations"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">Category</Label>
              <SearchableSelect
                options={categoryOptions}
                value={categoryFilter}
                onValueChange={setCategoryFilter}
                allOption
                allLabel="All Categories"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm font-medium text-[#333]">Product</Label>
              <SearchableSelect
                options={productOptions}
                value={productFilter}
                onValueChange={setProductFilter}
                allOption
                allLabel="All Products"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleGenerate}
              className="bg-[#5cb85c] text-white hover:bg-[#449d44]"
            >
              <FileText className="h-4 w-4" />
              Generate Report
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="border-[#f0ad4e] text-[#f0ad4e] hover:bg-[#f0ad4e]/10"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Filters
            </Button>
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportPDF}
                className="border-[#ccc]"
              >
                <FileDown className="h-4 w-4" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportExcel}
                className="border-[#ccc]"
              >
                <FileDown className="h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Results bar */}
      <div className="flex flex-col gap-2 rounded-sm bg-[#337ab7] px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Inventory Report Results</h3>
          <span className="inline-block rounded-sm bg-[#f0ad4e] px-2 py-0.5 text-xs font-medium text-white">
            {total} record(s) found!
          </span>
        </div>
      </div>

      {/* Desktop table */}
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
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
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
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {generated
                    ? "No inventory movements match the filters."
                    : "Click Generate Report to load data."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="flex items-center justify-center border border-[#ddd] bg-white p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length ? (
          data.map((item, idx) => (
            <div key={`${item.locationId}-${item.productId}`} className="border border-[#ddd] bg-white">
              <div className="flex items-center justify-between border-b border-[#eee] bg-[#f8f8f8] px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground">
                  #{(page - 1) * limit + idx + 1}
                </span>
                <span className="text-xs font-medium text-[#337ab7]">
                  {item.locationName}
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-[#337ab7]">
                  {item.productCode}
                </p>
                <p className="text-sm">{item.productName}</p>
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  <p>Category: {item.categoryName || "-"}</p>
                  <p>UOM: {item.uomCode || "-"}</p>
                  <p>Beg: {item.begBal}</p>
                  <p className="text-[#5cb85c]">In: {item.inQty}</p>
                  <p className="text-[#d9534f]">Out: {item.outQty}</p>
                  <p className="font-semibold text-[#333]">End: {item.endBal}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="border border-[#ddd] bg-white p-8 text-center text-sm text-muted-foreground">
            No inventory movements match the filters.
          </div>
        )}
      </div>

      {/* Pagination */}
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
          <span>
            of {total} entries
          </span>
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
    </div>
  );
}
