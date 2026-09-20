"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Search, X } from "lucide-react";

const statusOptions = [
  { value: "Active", label: "Active" },
  { value: "Deleted", label: "Deleted" },
];

interface DepartmentOption { id: number; department: string; }
interface RoleOption { id: number; role: string; }

interface UserSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (email: string, departmentId: string, roleId: string, status: string) => void;
}

export function UserSearchModal({
  open,
  onOpenChange,
  onSearch,
}: UserSearchModalProps) {
  const [searchEmail, setSearchEmail] = useState("");
  const [searchDeptId, setSearchDeptId] = useState("all");
  const [searchRoleId, setSearchRoleId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [rolesList, setRolesList] = useState<RoleOption[]>([]);

  useEffect(() => {
    if (open) {
      Promise.all([
        fetch("/api/departments?status=Active&limit=100").then((r) => r.json()),
        fetch("/api/roles?status=Active&limit=100").then((r) => r.json()),
      ]).then(([deptsJson, rolesJson]) => {
        if (deptsJson.data) setDepartments(deptsJson.data);
        if (rolesJson.data) setRolesList(rolesJson.data);
      }).catch(() => {});
    }
  }, [open]);

  const deptOptions = departments.map((d) => ({ value: String(d.id), label: d.department }));
  const roleOptions = rolesList.map((r) => ({ value: String(r.id), label: r.role }));

  const handleSearch = () => {
    onSearch(searchEmail, searchDeptId, searchRoleId, statusFilter);
    onOpenChange(false);
  };

  const handleClear = () => {
    setSearchEmail("");
    setSearchDeptId("all");
    setSearchRoleId("all");
    setStatusFilter("all");
    onSearch("", "all", "all", "all");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="flex max-h-[90vh] flex-col rounded-sm border-[#ddd] p-0 sm:max-w-md">
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#337ab7] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">Advanced Search</DialogTitle>
          <button onClick={() => onOpenChange(false)} className="text-white/70 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Email</Label>
            <Input
              placeholder="Search by email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Department</Label>
            <SearchableSelect options={deptOptions} value={searchDeptId} onValueChange={setSearchDeptId} allOption allLabel="All" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Role</Label>
            <SearchableSelect options={roleOptions} value={searchRoleId} onValueChange={setSearchRoleId} allOption allLabel="All" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Status</Label>
            <SearchableSelect options={statusOptions} value={statusFilter} onValueChange={setStatusFilter} allOption allLabel="All" />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#eee] bg-[#f8f8f8] px-4 py-3">
          <Button variant="outline" onClick={handleClear} className="border-[#ccc] bg-white text-[#333] hover:bg-[#f5f5f5]">
            <X className="mr-2 h-4 w-4" /> Clear
          </Button>
          <Button onClick={handleSearch} className="bg-[#337ab7] text-white hover:bg-[#286090]">
            <Search className="mr-2 h-4 w-4" /> Search
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
