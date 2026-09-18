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
import { getColumns, Product } from "./products-columns";
import { ProductFormModal } from "./product-form-modal";
import { ProductDeleteModal } from "./product-delete-modal";
import { ProductSearchModal } from "./product-search-modal";

export function ProductsTable({ timezone }: { timezone: string }) {
  const router = useRouter();
  const [data, setData] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [gstTypeFilter, setGstTypeFilter] = useState("all");
  const [uomFilter, setUomFilter] = useState("all");

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState<"add" | "edit">("add");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
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
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
      if (gstTypeFilter !== "all") params.set("gstTypeId", gstTypeFilter);
      if (uomFilter !== "all") params.set("uomId", uomFilter);

      const res = await fetch(`/api/products?${params}`);
      const json = await res.json();

      if (res.ok) {
        setData(json.data);
        setTotal(json.total);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sorting, search, statusFilter, categoryFilter, gstTypeFilter, uomFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleView = (product: Product) => {
    router.push(`/products/${product.id}`);
  };

  const handleEdit = (product: Product) => {
    setEditProduct(product);
    setFormModalMode("edit");
    setFormModalOpen(true);
  };

  const handleDelete = (product: Product) => {
    setDeleteProduct(product);
    setDeleteModalOpen(true);
  };

  const handleRestore = async (product: Product) => {
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "PATCH" });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Failed to restore product");
        return;
      }

      toast.success("Product restored successfully");
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

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Products Report", 14, 20);

    autoTable(doc, {
      startY: 30,
      head: [["#", "Code", "Name", "Category", "Brand", "GST Type", "UOM", "Selling Price", "Stock", "Status"]],
      body: data.map((p, idx) => [
        idx + 1,
        p.code,
        p.name,
        p.categoryName || "-",
        p.brand || "-",
        p.gstTypeName || "-",
        p.uomName || "-",
        Number(p.sellingPrice).toFixed(4),
        Number(p.stock).toFixed(4),
        p.status,
      ]),
    });

    doc.save("products.pdf");
  };

  const exportExcel = () => {
    const worksheetData = data.map((p, idx) => ({
      "#": idx + 1,
      Code: p.code,
      Name: p.name,
      Category: p.categoryName || "-",
      Brand: p.brand || "-",
      Model: p.model || "-",
      "GST Type": p.gstTypeName || "-",
      UOM: p.uomName || "-",
      "Min Stock": Number(p.minStock).toFixed(4),
      Stock: Number(p.stock).toFixed(4),
      "Last Cost": Number(p.lastCost).toFixed(4),
      "Avg Cost": Number(p.avgCost).toFixed(4),
      "Selling Price": Number(p.sellingPrice).toFixed(4),
      Status: p.status,
      "Created At": formatDateTime(p.createdAt, timezone),
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "products.xlsx");
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => { setFormModalMode("add"); setEditProduct(null); setFormModalOpen(true); }}
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
                  No products found.
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
          data.map((product, index) => (
            <div key={product.id} className="border border-[#ddd] bg-white">
              <div className="flex items-center justify-between border-b border-[#eee] bg-[#f8f8f8] px-4 py-2">
                <span className="font-mono text-xs text-[#337ab7]">{product.code}</span>
                <span
                  className={`px-2 py-0.5 text-xs font-medium ${
                    product.status === "Active"
                      ? "bg-[#5cb85c] text-white"
                      : "bg-[#999] text-white"
                  }`}
                >
                  {product.status}
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="text-base font-semibold text-[#337ab7]">{product.name}</p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {product.categoryName && <p><span className="font-medium text-[#666]">Category:</span> {product.categoryName}</p>}
                  {product.brand && <p><span className="font-medium text-[#666]">Brand:</span> {product.brand}</p>}
                  {product.uomName && <p><span className="font-medium text-[#666]">UOM:</span> {product.uomName}</p>}
                  <p><span className="font-medium text-[#666]">Stock:</span> {Number(product.stock).toFixed(4)}</p>
                  <p><span className="font-medium text-[#666]">Created:</span> {formatDateTime(product.createdAt, timezone)}</p>
                </div>
              </div>
              <div className="flex border-t border-[#eee]">
                <button
                  onClick={() => handleView(product)}
                  className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-[#5cb85c] transition-colors hover:bg-[#5cb85c]/10"
                >
                  <Eye className="h-4 w-4" />
                  View
                </button>
                <button
                  onClick={() => handleEdit(product)}
                  className="flex flex-1 items-center justify-center gap-1.5 border-l border-[#eee] py-2.5 text-xs font-medium text-[#337ab7] transition-colors hover:bg-[#337ab7]/10"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                {product.status === "Active" ? (
                  <button
                    onClick={() => handleDelete(product)}
                    className="flex flex-1 items-center justify-center gap-1.5 border-l border-[#eee] py-2.5 text-xs font-medium text-[#d9534f] transition-colors hover:bg-[#d9534f]/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                ) : (
                  <button
                    onClick={() => handleRestore(product)}
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
            No products found.
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
      <ProductFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        mode={formModalMode}
        product={editProduct}
        onSuccess={handleSuccess}
      />
      <ProductDeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        product={deleteProduct}
        onSuccess={handleSuccess}
      />
      <ProductSearchModal
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        onSearch={(term, status, catId, gstId, uomId) => {
          setSearch(term);
          setStatusFilter(status);
          setCategoryFilter(catId);
          setGstTypeFilter(gstId);
          setUomFilter(uomId);
          setPage(1);
        }}
      />
    </div>
  );
}
