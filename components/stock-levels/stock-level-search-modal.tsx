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

interface LocationOption {
  value: string;
  label: string;
}

interface StockLevelSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (term: string, locationId: string) => void;
  locationOptions: LocationOption[];
}

export function StockLevelSearchModal({
  open,
  onOpenChange,
  onSearch,
  locationOptions,
}: StockLevelSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");

  const handleSearch = () => {
    onSearch(searchTerm, locationFilter);
    onOpenChange(false);
  };

  const handleClear = () => {
    setSearchTerm("");
    setLocationFilter("all");
    onSearch("", "all");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="flex max-h-[90vh] flex-col rounded-sm border-[#ddd] p-0 sm:max-w-md">
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
            <Label
              htmlFor="search-stock-level"
              className="text-sm font-medium text-[#333]"
            >
              Product Code, Name, or Location
            </Label>
            <Input
              id="search-stock-level"
              placeholder="Search by product code, name, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
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
