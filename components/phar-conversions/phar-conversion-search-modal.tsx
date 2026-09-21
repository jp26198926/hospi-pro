"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Search, X } from "lucide-react";

const statusOptions = [
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

interface PharConversionSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (term: string, status: string, dateFrom: string, dateTo: string) => void;
}

export function PharConversionSearchModal({
  open,
  onOpenChange,
  onSearch,
}: PharConversionSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const handleSearch = () => {
    onSearch(searchTerm, statusFilter, dateFrom, dateTo);
    onOpenChange(false);
  };

  const handleClear = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    onSearch("", "all", "", "");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] flex-col rounded-sm border-[#ddd] p-0 sm:max-w-md"
      >
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
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">
              Product or Remarks
            </Label>
            <Input
              placeholder="Search pharmacy conversions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="phar-conv-date-from"
                className="text-sm font-medium text-[#333]"
              >
                Date From
              </Label>
              <DatePicker
                id="phar-conv-date-from"
                value={dateFrom}
                onValueChange={setDateFrom}
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="phar-conv-date-to"
                className="text-sm font-medium text-[#333]"
              >
                Date To
              </Label>
              <DatePicker
                id="phar-conv-date-to"
                value={dateTo}
                onValueChange={setDateTo}
                placeholder="YYYY-MM-DD"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Status</Label>
            <SearchableSelect
              options={statusOptions}
              value={statusFilter}
              onValueChange={setStatusFilter}
              allOption
              allLabel="All"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Location is fixed to <strong>pharmacy</strong>.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#eee] bg-[#f8f8f8] px-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            className="border-[#ccc]"
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
