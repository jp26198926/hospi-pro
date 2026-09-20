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
import { Loader2, X, Copy } from "lucide-react";
import type { Role } from "./roles-columns";

interface RoleCloneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  onSuccess: () => void;
}

export function RoleCloneModal({
  open,
  onOpenChange,
  role,
  onSuccess,
}: RoleCloneModalProps) {
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!newName.trim()) {
      toast.error("Role name is required");
      return;
    }

    if (!role) return;

    setLoading(true);
    try {
      const res = await fetch("/api/roles/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceRoleId: role.id, newRoleName: newName.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Failed to clone role");
        return;
      }

      toast.success(json.message || "Role cloned successfully");
      setNewName("");
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
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] flex-col rounded-sm border-[#ddd] p-0 sm:max-w-md"
      >
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#f0ad4e] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-white">Clone Role</DialogTitle>
          <button onClick={() => onOpenChange(false)} className="text-white/70 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div className="flex items-center gap-2 rounded-sm bg-[#fef9e7] p-3 border border-[#f0ad4e]/30">
            <Copy className="h-5 w-5 text-[#f0ad4e]" />
            <span className="text-sm text-[#333]">
              Cloning from <strong className="text-[#337ab7]">{role?.role}</strong>
            </span>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">
              New Role Name <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Enter new role name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#eee] bg-[#f8f8f8] px-4 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-[#ccc] bg-white text-[#333] hover:bg-[#f5f5f5]">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#f0ad4e] text-white hover:bg-[#ec971f]">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Clone
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
