"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  parse,
} from "date-fns";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  allowClear?: boolean;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function DatePicker({
  value,
  onValueChange,
  placeholder = "YYYY-MM-DD",
  id,
  className,
  allowClear = true,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    if (value) {
      const parsed = parse(value, "yyyy-MM-dd", new Date());
      return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    return new Date();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth));
    const end = endOfWeek(endOfMonth(viewMonth));
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const selectedDate = useMemo(() => {
    if (!value) return null;
    const parsed = parse(value, "yyyy-MM-dd", new Date());
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [value]);

  const handleSelect = (day: Date) => {
    onValueChange(format(day, "yyyy-MM-dd"));
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange("");
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        onClick={() => {
          if (!open) {
            if (value) {
              const parsed = parse(value, "yyyy-MM-dd", new Date());
              if (!Number.isNaN(parsed.getTime())) setViewMonth(parsed);
            } else {
              setViewMonth(new Date());
            }
          }
          setOpen(!open);
        }}
        className={cn(
          "flex h-9 w-full items-center justify-between border border-[#ccc] bg-white px-3 text-sm",
          "focus:border-[#337ab7] focus:outline-none focus:ring-1 focus:ring-[#337ab7]",
          open && "border-[#337ab7] ring-1 ring-[#337ab7]"
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {value || placeholder}
        </span>
        <span className="ml-2 flex shrink-0 items-center gap-1">
          {allowClear && value ? (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="text-muted-foreground hover:text-[#333]"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[260px] border border-[#ddd] bg-white shadow-md">
          <div className="flex items-center justify-between border-b border-[#eee] bg-[#f8f8f8] px-2 py-2">
            <button
              type="button"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              className="inline-flex h-7 w-7 items-center justify-center text-[#666] hover:bg-[#f0f7ff] hover:text-[#337ab7]"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-[#333]">
              {format(viewMonth, "MMM yyyy")}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="inline-flex h-7 w-7 items-center justify-center text-[#666] hover:bg-[#f0f7ff] hover:text-[#337ab7]"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0 border-b border-[#eee] bg-[#f2f2f2]">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-1 text-center text-[10px] font-semibold uppercase text-[#666]"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0 p-1">
            {days.map((day) => {
              const inMonth = isSameMonth(day, viewMonth);
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleSelect(day)}
                  className={cn(
                    "h-8 text-xs",
                    !inMonth && "text-[#bbb]",
                    inMonth && !isSelected && "text-[#333] hover:bg-[#f0f7ff] hover:text-[#337ab7]",
                    isSelected && "bg-[#337ab7] font-semibold text-white hover:bg-[#286090]"
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
