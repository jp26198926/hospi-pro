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
import type { Receiving } from "./receivings-columns";

type Action = "complete" | "cancel" | "restore";

interface ReceivingActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: Action;
  receiving: Receiving | null;
  onSuccess: () => void;
}

const titles: Record<Action, string> = {
  complete: "Mark as Completed",
  cancel: "Cancel Receiving",
  restore: "Restore Receiving",
};

export function ReceivingActionModal({
  open,
  onOpenChange,
  action,
  receiving,
  onSuccess,
}: ReceivingActionModalProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    if (!receiving) return;
    setLoading(true);
    try {
      let url = `/api/receivings/${receiving.id}`;
      let method = "POST";
      let body: string | undefined;

      if (action === "complete") {
        url = `/api/receivings/${receiving.id}/complete`;
        method = "POST";
      } else if (action === "cancel") {
        method = "DELETE";
        body = JSON.stringify({ reason: reason.trim() || undefined });
      } else {
        method = "PATCH";
      }

      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Action failed");
        return;
      }
      toast.success(
        json.message ||
          (action === "complete"
            ? "Receiving completed"
            : action === "cancel"
              ? "Receiving cancelled"
              : "Receiving restored")
      );
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
            action === "cancel"
              ? "bg-[#d9534f]"
              : action === "complete"
                ? "bg-[#5cb85c]"
                : "bg-[#f0ad4e]"
          }`}
        >
          <DialogTitle className="text-sm font-semibold text-white">
            {titles[action]}
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-[#333]">
                {action === "complete" && (
                  <>
                    Mark{" "}
                    <strong className="text-[#337ab7]">
                      {receiving?.transNo || "this receiving"}
                    </strong>{" "}
                    as Completed? Stock will be posted for draft items.
                  </>
                )}
                {action === "cancel" && (
                  <>
                    Cancel{" "}
                    <strong className="text-[#337ab7]">
                      {receiving?.transNo || "this receiving"}
                    </strong>
                    ?
                  </>
                )}
                {action === "restore" && (
                  <>
                    Restore{" "}
                    <strong className="text-[#337ab7]">
                      {receiving?.transNo || "this receiving"}
                    </strong>{" "}
                    to Draft?
                  </>
                )}
              </p>
            </div>
          </div>
          {action === "cancel" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">Reason (optional)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter cancel reason"
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
            className="border-[#ccc] bg-white text-[#333] hover:bg-[#f5f5f5]"
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
                : action === "complete"
                  ? "bg-[#5cb85c] text-white hover:bg-[#449d44]"
                  : "bg-[#f0ad4e] text-white hover:bg-[#ec971f]"
            }
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {action === "complete"
              ? "Mark Completed"
              : action === "cancel"
                ? "Cancel"
                : "Restore"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
