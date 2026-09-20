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
import { Loader2, X, AlertTriangle } from "lucide-react";
import type { TransType } from "./trans-types-columns";

interface TransTypeDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transType: TransType | null;
  onSuccess: () => void;
}

export function TransTypeDeleteModal({
  open,
  onOpenChange,
  transType,
  onSuccess,
}: TransTypeDeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleDelete = async () => {
    if (!transType) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/trans-types/${transType.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Failed to delete trans type");
        return;
      }

      toast.success("Trans type deleted successfully");
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
      <DialogContent showCloseButton={false} className="flex max-h-[90vh] flex-col rounded-sm border-[#ddd] p-0 sm:max-w-md">
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#d9534f] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">
            Delete Trans Type
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-[#333]">
                Are you sure you want to delete{" "}
                <strong className="text-[#337ab7]">{transType?.name}</strong>?
              </p>
              <p className="mt-1 text-sm text-red-500">This action cannot be undone.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-reason" className="text-sm font-medium text-[#333]">
              Reason (optional)
            </Label>
            <Input
              id="delete-reason"
              placeholder="Enter reason for deletion"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#eee] bg-[#f8f8f8] px-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-[#ccc] bg-white text-[#333] hover:bg-[#f5f5f5]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="bg-[#d9534f] text-white hover:bg-[#c9302c]"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
