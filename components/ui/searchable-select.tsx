"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchableSelectOption {
  value: string;
  label: string;
  indent?: boolean;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allOption?: boolean;
  allLabel?: string;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  allOption = false,
  allLabel = "All",
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => a.label.localeCompare(b.label));
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!search) return sortedOptions;
    return sortedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [sortedOptions, search]);

  const selectedLabel = useMemo(() => {
    if (allOption && value === "all") return allLabel;
    return sortedOptions.find((opt) => opt.value === value)?.label || placeholder;
  }, [sortedOptions, value, allOption, allLabel, placeholder]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    onValueChange(val);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(allOption ? "all" : "");
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 0); }}
        className="flex h-8 w-full items-center justify-between gap-2 border border-[#ccc] bg-white px-2.5 text-sm text-left outline-none hover:border-[#999] focus:border-[#337ab7] focus:ring-1 focus:ring-[#337ab7]"
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {selectedLabel}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {value && (
            <span
              onClick={handleClear}
              className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden border border-[#ddd] bg-white shadow-md">
          {/* Search input */}
          <div className="border-b border-[#eee] p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 w-full border border-[#ccc] bg-white pl-7 pr-2 text-sm outline-none focus:border-[#337ab7]"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {allOption && (
              <button
                type="button"
                onClick={() => handleSelect("all")}
                className={cn(
                  "flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-[#f0f7ff]",
                  value === "all" && "bg-[#e8f0fe] font-medium"
                )}
              >
                {allLabel}
              </button>
            )}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-[#f0f7ff]",
                    value === opt.value && "bg-[#e8f0fe] font-medium",
                    opt.indent && "pl-6"
                  )}
                >
                  {opt.label}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">No results found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
