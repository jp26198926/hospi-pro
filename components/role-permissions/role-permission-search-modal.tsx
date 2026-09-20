"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Search, X } from "lucide-react";

interface PageOption {
  id: number;
  page: string;
}

interface PermissionOption {
  id: number;
  permission: string;
}

interface RolePermissionSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (pageId: string, permissionId: string) => void;
}

export function RolePermissionSearchModal({
  open,
  onOpenChange,
  onSearch,
}: RolePermissionSearchModalProps) {
  const [searchPageId, setSearchPageId] = useState("all");
  const [searchPermissionId, setSearchPermissionId] = useState("all");
  const [pageOptions, setPageOptions] = useState<PageOption[]>([]);
  const [permissionOptions, setPermissionOptions] = useState<PermissionOption[]>([]);

  useEffect(() => {
    if (open) {
      Promise.all([
        fetch("/api/pages?status=Active&limit=100").then((r) => r.json()),
        fetch("/api/permissions?status=Active&limit=100").then((r) => r.json()),
      ]).then(([pagesJson, permsJson]) => {
        if (pagesJson.data) setPageOptions(pagesJson.data);
        if (permsJson.data) setPermissionOptions(permsJson.data);
      }).catch(() => {});
    }
  }, [open]);

  const pageSelectOptions = pageOptions.map((p) => ({
    value: String(p.id),
    label: p.page,
  }));

  const permissionSelectOptions = permissionOptions.map((p) => ({
    value: String(p.id),
    label: p.permission,
  }));

  const handleSearch = () => {
    onSearch(searchPageId, searchPermissionId);
    onOpenChange(false);
  };

  const handleClear = () => {
    setSearchPageId("all");
    setSearchPermissionId("all");
    onSearch("all", "all");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="flex max-h-[90vh] flex-col rounded-sm border-[#ddd] p-0 sm:max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#337ab7] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">
            Advanced Search
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Page</Label>
            <SearchableSelect
              options={pageSelectOptions}
              value={searchPageId}
              onValueChange={setSearchPageId}
              placeholder="Select page"
              allOption
              allLabel="All"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Permission</Label>
            <SearchableSelect
              options={permissionSelectOptions}
              value={searchPermissionId}
              onValueChange={setSearchPermissionId}
              placeholder="Select permission"
              allOption
              allLabel="All"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[#eee] bg-[#f8f8f8] px-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            className="border-[#ccc] bg-white text-[#333] hover:bg-[#f5f5f5]"
          >
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
          <Button
            type="button"
            onClick={handleSearch}
            className="bg-[#337ab7] text-white hover:bg-[#286090]"
          >
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
