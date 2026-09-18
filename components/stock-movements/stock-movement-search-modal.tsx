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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Search, X } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface StockMovementSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (
    term: string,
    transTypeId: string,
    locationId: string,
    dateFrom: string,
    dateTo: string
  ) => void;
  transTypeOptions: SelectOption[];
  locationOptions: SelectOption[];
}

export function StockMovementSearchModal({
  open,
  onOpenChange,
  onSearch,
  transTypeOptions,
  locationOptions,
}: StockMovementSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [transTypeFilter, setTransTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const handleSearch = () => {
    onSearch(searchTerm, transTypeFilter, locationFilter, dateFrom, dateTo);
    onOpenChange(false);
  };

  const handleClear = () => {
    setSearchTerm("");
    setTransTypeFilter("all");
    setLocationFilter("all");
    setDateFrom("");
    setDateTo("");
    onSearch("", "all", "all", "", "");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-sm border-[#ddd] p-0">
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

        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label
              htmlFor="search-stock-movement"
              className="text-sm font-medium text-[#333]"
            >
              Trans Type, Product, Location, or Reference
            </Label>
            <Input
              id="search-stock-movement"
              placeholder="Search movements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Trans Type</Label>
            <SearchableSelect
              options={transTypeOptions}
              value={transTypeFilter}
              onValueChange={setTransTypeFilter}
              allOption
              allLabel="All"
              placeholder="All trans types"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Location</Label>
            <SearchableSelect
              options={locationOptions}
              value={locationFilter}
              onValueChange={setLocationFilter}
              allOption
              allLabel="All"
              placeholder="All locations"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date-from" className="text-sm font-medium text-[#333]">
                Date From
              </Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to" className="text-sm font-medium text-[#333]">
                Date To
              </Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
            </div>
          </div>
        </div>

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
