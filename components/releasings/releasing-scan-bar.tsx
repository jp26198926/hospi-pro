"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Barcode, Search } from "lucide-react";

interface ReleasingScanBarProps {
  releasingId: number;
  fromLocationId: number;
  disabled?: boolean;
  onSuccess: () => void;
}

function fmtQty(v: string | number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toFixed(4);
}

function parseScan(raw: string): { code: string; qty: number } {
  const value = raw.trim();
  let qty = 1;
  let code = value;
  if (value.includes("*")) {
    const parts = value.split("*");
    if (parts.length >= 2) {
      const n = Number(parts[0]);
      qty = Number.isFinite(n) && n > 0 ? n : 1;
      code = parts.slice(1).join("*").trim();
    }
  }
  return { code, qty };
}

export function ReleasingScanBar({
  releasingId,
  fromLocationId,
  disabled,
  onSuccess,
}: ReleasingScanBarProps) {
  const [scanValue, setScanValue] = useState("");
  const [loading, setLoading] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        scanRef.current?.focus();
        scanRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** Lookup product by code and add item immediately */
  const autoAddFromScan = async (raw: string) => {
    const value = raw.trim();
    if (!value || disabled || loading) return;

    const { code, qty } = parseScan(value);
    if (!code) {
      toast.error("Scan barcode is empty");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/products/scan?code=${encodeURIComponent(code)}&locationId=${fromLocationId}`
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || `Product not found for barcode: ${code}`);
        return;
      }

      const product = json.data as {
        id: number;
        code: string;
        name: string;
        uomName?: string | null;
        stockQty?: string;
      };

      const addRes = await fetch("/api/releasing-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releasingId,
          productId: product.id,
          qty,
        }),
      });
      const addJson = await addRes.json();
      if (!addRes.ok) {
        toast.error(addJson.error || "Failed to add item");
        return;
      }

      toast.success(
        `Added ${product.code} x ${fmtQty(qty)}${
          product.uomName ? ` (${product.uomName})` : ""
        }`
      );
      setScanValue("");
      onSuccess();
    } catch {
      toast.error("Scan failed");
    } finally {
      setLoading(false);
      scanRef.current?.focus();
    }
  };

  return (
    <div className="space-y-2 rounded-sm border border-[#ddd] bg-[#fafafa] p-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Barcode className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={scanRef}
            value={scanValue}
            disabled={disabled}
            placeholder="Scan barcode here or press F2..."
            onChange={(e) => setScanValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                autoAddFromScan(scanValue);
              }
            }}
            className="border-[#ccc] pl-9 focus:border-[#f0ad4e] focus:ring-[#f0ad4e]"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || loading || !scanValue.trim()}
          onClick={() => autoAddFromScan(scanValue)}
          className="border-[#ccc]"
        >
          <Search className="mr-2 h-4 w-4" />
          Scan
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Scan to <strong>add item automatically</strong>. Press{" "}
        <strong>F2</strong> to focus. Use <strong>5*P000001</strong> for qty
        (default 1). Stock is checked at the from-location.
      </p>
      {loading && (
        <p className="text-xs text-muted-foreground">Processing scan...</p>
      )}
    </div>
  );
}
