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
import { formatDateTime } from "@/lib/datetime";
import { getColumns, Supplier } from "./suppliers-columns";
import { SupplierFormModal } from "./supplier-form-modal";
import { SupplierDeleteModal } from "./supplier-delete-modal";
import { SupplierSearchModal } from "./supplier-search-modal";

export function SuppliersTable({ timezone }: { timezone: string }) {
  const router = useRouter();
  const [data, setData] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState<"add" | "edit">("add");
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const totalPages = Math.ceil(total / limit);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const sortBy = sorting[0]?.id || "createdAt";
      const sortOrder = sorting[0]?.desc ? "desc" : "asc";
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });
      if (search) params.set("search", search);
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const res = await fetch(`/api/suppliers?${params}`);
      const json = await res.json();

      if (res.ok) {
        setData(json.data);
        setTotal(json.total);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sorting, search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleView = (supplier: Supplier) => {
    router.push(`/suppliers/${supplier.id}`);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditSupplier(supplier);
    setFormModalMode("edit");
    setFormModalOpen(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setDeleteSupplier(supplier);
    setDeleteModalOpen(true);
  };

  const handleRestore = async (supplier: Supplier) => {
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, { method: "PATCH" });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Failed to restore supplier");
        return;
      }

      toast.success("Supplier restored successfully");
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
    doc.text("Suppliers Report", 14, 20);

    autoTable(doc, {
      startY: 30,
      head: [["#", "Name", "Contact Person", "Phone", "Email", "Status", "Created At"]],
      body: data.map((s, idx) => [
        idx + 1,
        s.name,
        s.contactPerson || "-",
        s.phone || "-",
        s.email || "-",
        s.status,
        formatDateTime(s.createdAt, timezone),
      ]),
    });

    doc.save("suppliers.pdf");
  };

  const exportExcel = () => {
    const worksheetData = data.map((s, idx) => ({
      "#": idx + 1,
      Name: s.name,
      "Contact Person": s.contactPerson || "-",
      Phone: s.phone || "-",
      Email: s.email || "-",
      Status: s.status,
      "Created At": formatDateTime(s.createdAt, timezone),
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Suppliers");
    XLSX.writeFile(workbook, "suppliers.xlsx");
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => { setFormModalMode("add"); setEditSupplier(null); setFormModalOpen(true); }}
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
                  No suppliers found.
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
          data.map((supplier, index) => (
            <div key={supplier.id} className="border border-[#ddd] bg-white">
              <div className="flex items-center justify-between border-b border-[#eee] bg-[#f8f8f8] px-4 py-2">
                <span className="text-xs text-muted-foreground">#{index + 1}</span>
                <span
                  className={`px-2 py-0.5 text-xs font-medium ${
                    supplier.status === "Active"
                      ? "bg-[#5cb85c] text-white"
                      : "bg-[#999] text-white"
                  }`}
                >
                  {supplier.status}
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="text-base font-semibold text-[#337ab7]">{supplier.name}</p>
                {supplier.contactPerson && (
                  <p className="text-sm text-[#333]">{supplier.contactPerson}</p>
                )}
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {supplier.phone && <p><span className="font-medium text-[#666]">Phone:</span> {supplier.phone}</p>}
                  {supplier.email && <p><span className="font-medium text-[#666]">Email:</span> {supplier.email}</p>}
                  <p><span className="font-medium text-[#666]">Created:</span> {formatDateTime(supplier.createdAt, timezone)}</p>
                </div>
              </div>
              <div className="flex border-t border-[#eee]">
                <button
                  onClick={() => handleView(supplier)}
                  className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-[#5cb85c] transition-colors hover:bg-[#5cb85c]/10"
                >
                  <Eye className="h-4 w-4" />
                  View
                </button>
                <button
                  onClick={() => handleEdit(supplier)}
                  className="flex flex-1 items-center justify-center gap-1.5 border-l border-[#eee] py-2.5 text-xs font-medium text-[#337ab7] transition-colors hover:bg-[#337ab7]/10"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                {supplier.status === "Active" ? (
                  <button
                    onClick={() => handleDelete(supplier)}
                    className="flex flex-1 items-center justify-center gap-1.5 border-l border-[#eee] py-2.5 text-xs font-medium text-[#d9534f] transition-colors hover:bg-[#d9534f]/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                ) : (
                  <button
                    onClick={() => handleRestore(supplier)}
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
            No suppliers found.
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
      <SupplierFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        mode={formModalMode}
        supplier={editSupplier}
        onSuccess={handleSuccess}
      />
      <SupplierDeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        supplier={deleteSupplier}
        onSuccess={handleSuccess}
      />
      <SupplierSearchModal
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        onSearch={(term, status) => { setSearch(term); setStatusFilter(status); setPage(1); }}
      />
    </div>
  );
}
