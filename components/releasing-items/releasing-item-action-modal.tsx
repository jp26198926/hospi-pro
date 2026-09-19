"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";
import type { ReleasingItem } from "./releasing-items-columns";

interface ReleasingItemActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "cancel" | "restore";
  item: ReleasingItem | null;
  onSuccess: () => void;
}

export function ReleasingItemActionModal({
  open,
  onOpenChange,
  action,
  item,
  onSuccess,
}: ReleasingItemActionModalProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    if (!item) return;
    setLoading(true);
    try {
      const method = action === "cancel" ? "DELETE" : "PATCH";
      const res = await fetch(`/api/releasing-items/${item.id}`, {
        method,
        headers:
          action === "cancel" ? { "Content-Type": "application/json" } : undefined,
        body:
          action === "cancel"
            ? JSON.stringify({ reason: reason.trim() || undefined })
            : undefined,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Action failed");
        return;
      }
      toast.success(action === "cancel" ? "Item cancelled" : "Item restored");
      setReason("");
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-sm border-[#ddd] p-0">
        <div
          className={`flex items-center justify-between border-b border-[#ddd] px-4 py-3 ${
            action === "cancel" ? "bg-[#d9534f]" : "bg-[#f0ad4e]"
          }`}
        >
          <DialogTitle className="text-sm font-semibold text-white">
            {action === "cancel" ? "Cancel Item" : "Restore Item"}
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-4">
          <p className="text-sm text-[#333]">
            {action === "cancel" ? (
              <>
                Cancel item{" "}
                <strong className="text-[#337ab7]">
                  {item?.seriesNo || `#${item?.id}`}
                </strong>
                ?
              </>
            ) : (
              <>
                Restore item{" "}
                <strong className="text-[#337ab7]">
                  {item?.seriesNo || `#${item?.id}`}
                </strong>{" "}
                to Draft?
              </>
            )}
          </p>
          {action === "cancel" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">
                Reason (optional)
              </Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#eee] bg-[#f8f8f8] px-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-[#ccc]"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={
              action === "cancel"
                ? "bg-[#d9534f] text-white hover:bg-[#c9302c]"
                : "bg-[#f0ad4e] text-white hover:bg-[#ec971f]"
            }
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {action === "cancel" ? "Cancel Item" : "Restore Item"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
