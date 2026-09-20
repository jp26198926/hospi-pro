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

interface PageSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (term: string, path: string, parent: string, status: string) => void;
}

export function PageSearchModal({
  open,
  onOpenChange,
  onSearch,
}: PageSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPath, setSearchPath] = useState("");
  const [searchParent, setSearchParent] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [parentPages, setParentPages] = useState<{ id: number; page: string }[]>([]);

  useEffect(() => {
    if (open) {
      fetch("/api/pages?status=Active&limit=100")
        .then((res) => res.json())
        .then((json) => {
          if (json.data) setParentPages(json.data);
        })
        .catch(() => {});
    }
  }, [open]);

  const parentOptions = parentPages.map((p) => ({
    value: String(p.id),
    label: p.page,
  }));

  const handleSearch = () => {
    onSearch(searchTerm, searchPath, searchParent, statusFilter);
    onOpenChange(false);
  };

  const handleClear = () => {
    setSearchTerm("");
    setSearchPath("");
    setSearchParent("all");
    setStatusFilter("all");
    onSearch("", "", "all", "all");
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
            <Label htmlFor="search-page" className="text-sm font-medium text-[#333]">
              Page Name
            </Label>
            <Input
              id="search-page"
              placeholder="Search by page name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="search-path" className="text-sm font-medium text-[#333]">
              Path
            </Label>
            <Input
              id="search-path"
              placeholder="Search by path..."
              value={searchPath}
              onChange={(e) => setSearchPath(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="border-[#ccc] font-mono text-sm focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">
              Parent
            </Label>
            <SearchableSelect
              options={parentOptions}
              value={searchParent}
              onValueChange={setSearchParent}
              allOption
              allLabel="All"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">
              Status
            </Label>
            <SearchableSelect
              options={statusOptions}
              value={statusFilter}
              onValueChange={setStatusFilter}
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
