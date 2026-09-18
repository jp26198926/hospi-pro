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
import type { PaymentTerm } from "./payment-terms-columns";

interface PaymentTermDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentTerm: PaymentTerm | null;
  onSuccess: () => void;
}

export function PaymentTermDeleteModal({
  open,
  onOpenChange,
  paymentTerm,
  onSuccess,
}: PaymentTermDeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleDelete = async () => {
    if (!paymentTerm) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/payment-terms/${paymentTerm.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Failed to delete payment term");
        return;
      }

      toast.success("Payment term deleted successfully");
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
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#d9534f] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">
            Delete Payment Term
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-[#333]">
                Are you sure you want to delete{" "}
                <strong className="text-[#337ab7]">{paymentTerm?.name}</strong>?
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
