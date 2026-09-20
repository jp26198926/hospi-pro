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
import type { Releasing } from "./releasings-columns";

type Action = "complete" | "cancel" | "restore";

interface ReleasingActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: Action;
  releasing: Releasing | null;
  onSuccess: () => void;
}

export function ReleasingActionModal({
  open,
  onOpenChange,
  action,
  releasing,
  onSuccess,
}: ReleasingActionModalProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    if (!releasing) return;
    setLoading(true);
    try {
      let url = `/api/releasings/${releasing.id}`;
      let method = "POST";
      let body: string | undefined;

      if (action === "complete") {
        url = `/api/releasings/${releasing.id}/complete`;
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
            ? "Releasing completed"
            : action === "cancel"
              ? "Releasing cancelled"
              : "Releasing restored")
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
      <DialogContent showCloseButton={false} className="flex max-h-[90vh] flex-col rounded-sm border-[#ddd] p-0 sm:max-w-md">
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
            {action === "complete"
              ? "Mark as Completed"
              : action === "cancel"
                ? "Cancel Releasing"
                : "Restore Releasing"}
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-[#333]">
                {action === "complete" && (
                  <>
                    Mark{" "}
                    <strong className="text-[#337ab7]">
                      {releasing?.transNo || "this releasing"}
                    </strong>{" "}
                    as Completed? Stock will be released from the from-location.
                  </>
                )}
                {action === "cancel" && (
                  <>
                    Cancel{" "}
                    <strong className="text-[#337ab7]">
                      {releasing?.transNo || "this releasing"}
                    </strong>
                    ?
                  </>
                )}
                {action === "restore" && (
                  <>
                    Restore{" "}
                    <strong className="text-[#337ab7]">
                      {releasing?.transNo || "this releasing"}
                    </strong>{" "}
                    to Draft?
                  </>
                )}
              </p>
            </div>
          </div>
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
