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

interface CategoryOption {
  id: number;
  name: string;
}

interface GstTypeOption {
  id: number;
  code: string;
  name: string;
}

interface ProductSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (term: string, status: string, categoryId: string, gstTypeId: string) => void;
}

export function ProductSearchModal({
  open,
  onOpenChange,
  onSearch,
}: ProductSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [gstTypeFilter, setGstTypeFilter] = useState("all");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [gstTypes, setGstTypes] = useState<GstTypeOption[]>([]);

  useEffect(() => {
    if (open) {
      Promise.all([
        fetch("/api/categories?status=Active&limit=100").then((r) => r.json()),
        fetch("/api/gst-types?status=Active&limit=100").then((r) => r.json()),
      ]).then(([catJson, gstJson]) => {
        if (catJson.data) setCategories(catJson.data);
        if (gstJson.data) setGstTypes(gstJson.data);
      }).catch(() => {});
    }
  }, [open]);

  const categoryOptions = categories.map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  const gstTypeOptions = gstTypes.map((g) => ({
    value: String(g.id),
    label: `${g.code} — ${g.name}`,
  }));

  const handleSearch = () => {
    onSearch(searchTerm, statusFilter, categoryFilter, gstTypeFilter);
    onOpenChange(false);
  };

  const handleClear = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setGstTypeFilter("all");
    onSearch("", "all", "all", "all");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-sm border-[#ddd] p-0">
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
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="search-product" className="text-sm font-medium text-[#333]">
              Code, Name, Brand, or Model
            </Label>
            <Input
              id="search-product"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">
              Category
            </Label>
            <SearchableSelect
              options={categoryOptions}
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              placeholder="Select category"
              allOption
              allLabel="All"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">
              GST Type
            </Label>
            <SearchableSelect
              options={gstTypeOptions}
              value={gstTypeFilter}
              onValueChange={setGstTypeFilter}
              placeholder="Select GST type"
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
