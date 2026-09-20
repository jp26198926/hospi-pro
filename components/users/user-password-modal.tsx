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
import { Loader2, X, Key } from "lucide-react";
import type { UserRecord } from "./users-columns";

interface UserPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRecord | null;
  onSuccess: () => void;
}

export function UserPasswordModal({
  open,
  onOpenChange,
  user,
  onSuccess,
}: UserPasswordModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Failed to update password");
        return;
      }

      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
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
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#9b59b6] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">Change Password</DialogTitle>
          <button onClick={() => onOpenChange(false)} className="text-white/70 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div className="flex items-center gap-2 rounded-sm bg-[#f5f0ff] p-3">
            <Key className="h-5 w-5 text-[#9b59b6]" />
            <span className="text-sm text-[#333]">Changing password for <strong>{user?.email}</strong></span>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">
              New Password <span className="text-red-500">*</span>
            </Label>
            <Input
              type="password"
              placeholder="Enter new password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">
              Confirm Password <span className="text-red-500">*</span>
            </Label>
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 border-t border-[#eee] bg-[#f8f8f8] px-4 py-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-[#ccc] bg-white text-[#333] hover:bg-[#f5f5f5]">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-[#9b59b6] text-white hover:bg-[#8e44ad]">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
