"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  FileDown,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  RotateCcw,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { getColumns, PageRecord } from "./pages-columns";
import { PageFormModal } from "./page-form-modal";
import { PageDeleteModal } from "./page-delete-modal";
import { PageSearchModal } from "./page-search-modal";

export function PagesTable() {
  const router = useRouter();
  const [data, setData] = useState<PageRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchPath, setSearchPath] = useState("");
  const [searchParent, setSearchParent] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState<"add" | "edit">("add");
  const [editPage, setEditPage] = useState<PageRecord | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePage, setDeletePage] = useState<PageRecord | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const totalPages = Math.ceil(total / limit);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const sortBy = sorting[0]?.id || "order";
      const sortOrder = sorting[0]?.desc ? "desc" : "asc";
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });
      if (search) params.set("search", search);
      if (searchPath) params.set("searchPath", searchPath);
      if (searchParent) params.set("searchParent", searchParent);
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const res = await fetch(`/api/pages?${params}`);
      const json = await res.json();

      if (res.ok) {
        setData(json.data);
        setTotal(json.total);
      }
    } catch (error) {
      console.error("Failed to fetch pages:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sorting, search, searchPath, searchParent, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleView = (pageRecord: PageRecord) => {
    router.push(`/pages/${pageRecord.id}`);
  };

  const handleEdit = (pageRecord: PageRecord) => {
    setEditPage(pageRecord);
    setFormModalMode("edit");
    setFormModalOpen(true);
  };

  const handleDelete = (pageRecord: PageRecord) => {
    setDeletePage(pageRecord);
    setDeleteModalOpen(true);
  };

  const handleRestore = async (pageRecord: PageRecord) => {
    try {
      const res = await fetch(`/api/pages/${pageRecord.id}`, { method: "PATCH" });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Failed to restore page");
        return;
      }

      toast.success("Page restored successfully");
      fetchData();
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  const handleSuccess = () => {
    fetchData();
  };

  const columns = getColumns({
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onRestore: handleRestore,
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

  // Export to PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Pages Report", 14, 20);

    autoTable(doc, {
      startY: 30,
      head: [["#", "Page", "Path", "Icon", "Parent", "Order", "Status"]],
      body: data.map((p, idx) => [
        idx + 1,
        p.page,
        p.path,
        p.icon || "-",
        p.parentName || "-",
        p.order ?? "-",
        p.status,
      ]),
    });

    doc.save("pages.pdf");
  };

  // Export to Excel
  const exportExcel = () => {
    const worksheetData = data.map((p, idx) => ({
      "#": idx + 1,
      Page: p.page,
      Path: p.path,
      Icon: p.icon || "",
      Parent: p.parentName || "",
      Order: p.order ?? "",
      Status: p.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pages");
    XLSX.writeFile(workbook, "pages.xlsx");
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => { setFormModalMode("add"); setEditPage(null); setFormModalOpen(true); }}
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
        <div className="flex w-full gap-2 sm:w-auto sm:items-center">
          <Button variant="outline" size="sm" onClick={exportPDF} className="flex-1 border-[#ccc] sm:flex-none">
            <FileDown className="h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} className="flex-1 border-[#ccc] sm:flex-none">
            <FileDown className="h-4 w-4" />
            Excel
          </Button>
        </div>
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
                  No pages found.
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
          data.map((pageRecord, index) => (
            <div key={pageRecord.id} className="border border-[#ddd] bg-white">
              {/* Card header */}
              <div className="flex items-center justify-between border-b border-[#eee] bg-[#f8f8f8] px-4 py-2">
                <span className="text-xs text-muted-foreground">#{index + 1}</span>
                <span
                  className={`px-2 py-0.5 text-xs font-medium ${
                    pageRecord.status === "Active"
                      ? "bg-[#5cb85c] text-white"
                      : "bg-[#999] text-white"
                  }`}
                >
                  {pageRecord.status}
                </span>
              </div>

              {/* Card body */}
              <div className="px-4 py-3">
                <p className="text-base font-semibold text-[#337ab7]">{pageRecord.page}</p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{pageRecord.path}</p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {pageRecord.icon && <p><span className="font-medium text-[#666]">Icon:</span> {pageRecord.icon}</p>}
                  {pageRecord.parentName && <p><span className="font-medium text-[#666]">Parent:</span> {pageRecord.parentName}</p>}
                  <p><span className="font-medium text-[#666]">Order:</span> {pageRecord.order ?? "-"}</p>
                </div>
              </div>

              {/* Card actions */}
              <div className="flex border-t border-[#eee]">
                <button
                  onClick={() => handleView(pageRecord)}
                  className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-[#5cb85c] transition-colors hover:bg-[#5cb85c]/10"
                >
                  <Eye className="h-4 w-4" />
                  View
                </button>
                <button
                  onClick={() => handleEdit(pageRecord)}
                  className="flex flex-1 items-center justify-center gap-1.5 border-l border-[#eee] py-2.5 text-xs font-medium text-[#337ab7] transition-colors hover:bg-[#337ab7]/10"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                {pageRecord.status === "Active" ? (
                  <button
                    onClick={() => handleDelete(pageRecord)}
                    className="flex flex-1 items-center justify-center gap-1.5 border-l border-[#eee] py-2.5 text-xs font-medium text-[#d9534f] transition-colors hover:bg-[#d9534f]/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                ) : (
                  <button
                    onClick={() => handleRestore(pageRecord)}
                    className="flex flex-1 items-center justify-center gap-1.5 border-l border-[#eee] py-2.5 text-xs font-medium text-[#f0ad4e] transition-colors hover:bg-[#f0ad4e]/10"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restore
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="border border-[#ddd] bg-white p-8 text-center text-sm text-muted-foreground">
            No pages found.
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

      {/* Modals */}
      <PageFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        mode={formModalMode}
        page={editPage}
        onSuccess={handleSuccess}
      />
      <PageDeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        page={deletePage}
        onSuccess={handleSuccess}
      />
      <PageSearchModal
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        onSearch={(term, path, parent, status) => { setSearch(term); setSearchPath(path); setSearchParent(parent); setStatusFilter(status); setPage(1); }}
      />
    </div>
  );
}
