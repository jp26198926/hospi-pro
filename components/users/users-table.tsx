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
  Key,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { getColumns, UserRecord } from "./users-columns";
import { UserFormModal } from "./user-form-modal";
import { UserDeleteModal } from "./user-delete-modal";
import { UserSearchModal } from "./user-search-modal";
import { UserPasswordModal } from "./user-password-modal";

export function UsersTable() {
  const router = useRouter();
  const [data, setData] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDeptId, setSearchDeptId] = useState("all");
  const [searchRoleId, setSearchRoleId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState<"add" | "edit">("add");
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<UserRecord | null>(null);

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
      if (searchDeptId !== "all") params.set("departmentId", searchDeptId);
      if (searchRoleId !== "all") params.set("roleId", searchRoleId);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/users?${params}`);
      const json = await res.json();

      if (res.ok) {
        setData(json.data);
        setTotal(json.total);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sorting, search, searchDeptId, searchRoleId, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleView = (user: UserRecord) => { router.push(`/users/${user.id}`); };
  const handleEdit = (user: UserRecord) => { setEditUser(user); setFormModalMode("edit"); setFormModalOpen(true); };
  const handleDelete = (user: UserRecord) => { setDeleteUser(user); setDeleteModalOpen(true); };
  const handleChangePassword = (user: UserRecord) => { setPasswordUser(user); setPasswordModalOpen(true); };

  const handleRestore = async (user: UserRecord) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "PATCH" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed to restore user"); return; }
      toast.success("User restored successfully");
      fetchData();
    } catch { toast.error("An unexpected error occurred"); }
  };

  const handleSuccess = () => { fetchData(); };

  const columns = getColumns({ onView: handleView, onEdit: handleEdit, onDelete: handleDelete, onRestore: handleRestore, onChangePassword: handleChangePassword });

  const table = useReactTable({
    data, columns, pageCount: totalPages,
    state: { sorting, pagination: { pageIndex: page - 1, pageSize: limit } },
    onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(),
    manualPagination: true, manualSorting: true,
  });

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Users Report", 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [["#", "Email", "First Name", "Last Name", "Department", "Role", "Status"]],
      body: data.map((u, idx) => [idx + 1, u.email, u.firstname, u.lastname, u.departmentName || "-", u.roleName || "-", u.status]),
    });
    doc.save("users.pdf");
  };

  const exportExcel = () => {
    const worksheetData = data.map((u, idx) => ({
      "#": idx + 1, Email: u.email, "First Name": u.firstname, "Last Name": u.lastname,
      Department: u.departmentName || "", Role: u.roleName || "", Status: u.status,
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(workbook, "users.xlsx");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={() => { setFormModalMode("add"); setEditUser(null); setFormModalOpen(true); }} className="bg-[#337ab7] text-white hover:bg-[#286090]">
            <Plus className="h-4 w-4" /> Add
          </Button>
          <Button variant="outline" onClick={() => setSearchModalOpen(true)} className="border-[#ccc]">
            <Search className="h-4 w-4" /> Advanced Search
          </Button>
        </div>
        <div className="flex w-full gap-2 sm:w-auto sm:items-center">
          <Button variant="outline" size="sm" onClick={exportPDF} className="flex-1 border-[#ccc] sm:flex-none">
            <FileDown className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} className="flex-1 border-[#ccc] sm:flex-none">
            <FileDown className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-hidden border border-[#ddd] md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-b border-[#ddd] bg-[#f2f2f2]">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="border-r border-[#eee] text-xs font-semibold uppercase text-[#666] last:border-r-0">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
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
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No users found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="flex items-center justify-center border border-[#ddd] bg-white p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : data.length ? (
          data.map((user, index) => (
            <div key={user.id} className="border border-[#ddd] bg-white">
              <div className="flex items-center justify-between border-b border-[#eee] bg-[#f8f8f8] px-4 py-2">
                <span className="text-xs text-muted-foreground">#{index + 1}</span>
                <span className={`px-2 py-0.5 text-xs font-medium ${user.status === "Active" ? "bg-[#5cb85c] text-white" : "bg-[#999] text-white"}`}>{user.status}</span>
              </div>
              <div className="px-4 py-3">
                <p className="text-base font-semibold text-[#337ab7]">{user.email}</p>
                <p className="text-sm text-[#333]">{user.firstname} {user.lastname}</p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {user.departmentName && <p><span className="font-medium text-[#666]">Dept:</span> {user.departmentName}</p>}
                  {user.roleName && <p><span className="font-medium text-[#666]">Role:</span> {user.roleName}</p>}
                </div>
              </div>
              <div className="flex border-t border-[#eee]">
                <button onClick={() => handleView(user)} className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-[#5cb85c] hover:bg-[#5cb85c]/10"><Eye className="h-4 w-4" /> View</button>
                <button onClick={() => handleEdit(user)} className="flex flex-1 items-center justify-center gap-1.5 border-l border-[#eee] py-2.5 text-xs font-medium text-[#337ab7] hover:bg-[#337ab7]/10"><Pencil className="h-4 w-4" /> Edit</button>
                {user.status === "Active" ? (
                  <button onClick={() => handleDelete(user)} className="flex flex-1 items-center justify-center gap-1.5 border-l border-[#eee] py-2.5 text-xs font-medium text-[#d9534f] hover:bg-[#d9534f]/10"><Trash2 className="h-4 w-4" /> Delete</button>
                ) : (
                  <button onClick={() => handleRestore(user)} className="flex flex-1 items-center justify-center gap-1.5 border-l border-[#eee] py-2.5 text-xs font-medium text-[#f0ad4e] hover:bg-[#f0ad4e]/10"><RotateCcw className="h-4 w-4" /> Restore</button>
                )}
                <button onClick={() => handleChangePassword(user)} className="flex flex-1 items-center justify-center gap-1.5 border-l border-[#eee] py-2.5 text-xs font-medium text-[#9b59b6] hover:bg-[#9b59b6]/10"><Key className="h-4 w-4" /> Password</button>
              </div>
            </div>
          ))
        ) : (
          <div className="border border-[#ddd] bg-white p-8 text-center text-sm text-muted-foreground">No users found.</div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Show</span>
          <Select value={String(limit)} onValueChange={(val) => { setLimit(Number(val)); setPage(1); }}>
            <SelectTrigger className="h-8 w-[70px] border-[#ccc]"><SelectValue /></SelectTrigger>
            <SelectContent>{[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
          </Select>
          <span>of {total} entries</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="border-[#ccc]"><ChevronLeft className="h-4 w-4" /></Button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) pageNum = i + 1;
            else if (page <= 3) pageNum = i + 1;
            else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
            else pageNum = page - 2 + i;
            return <Button key={pageNum} variant={page === pageNum ? "default" : "outline"} size="icon-sm" onClick={() => setPage(pageNum)} className={page === pageNum ? "bg-[#337ab7] text-white hover:bg-[#286090]" : "border-[#ccc]"}>{pageNum}</Button>;
          })}
          <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="border-[#ccc]"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Modals */}
      <UserFormModal open={formModalOpen} onOpenChange={setFormModalOpen} mode={formModalMode} user={editUser} onSuccess={handleSuccess} />
      <UserDeleteModal open={deleteModalOpen} onOpenChange={setDeleteModalOpen} user={deleteUser} onSuccess={handleSuccess} />
      <UserSearchModal open={searchModalOpen} onOpenChange={setSearchModalOpen} onSearch={(email, dept, role, status) => { setSearch(email); setSearchDeptId(dept); setSearchRoleId(role); setStatusFilter(status); setPage(1); }} />
      <UserPasswordModal open={passwordModalOpen} onOpenChange={setPasswordModalOpen} user={passwordUser} onSuccess={handleSuccess} />
    </div>
  );
}
