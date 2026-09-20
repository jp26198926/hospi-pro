"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { profileSchema, ProfileInput } from "@/lib/validations/auth";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserProfile {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  departmentName: string | null;
  roleName: string | null;
  status: string;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const token = localStorage.getItem("accessToken");
    fetch("/api/auth/me", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setUser(json.data);
          reset({
            firstname: json.data.firstname,
            lastname: json.data.lastname,
            email: json.data.email,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, reset]);

  const onSubmit = async (data: ProfileInput) => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Failed to update profile");
        return;
      }

      toast.success("Profile updated successfully");
      onOpenChange(false);
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="flex max-h-[90vh] flex-col rounded-sm border-[#ddd] p-0 sm:max-w-md">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-[#337ab7]">My Profile</DialogTitle>
        </div>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <div className="space-y-2">
              <Label htmlFor="firstname" className="text-sm font-medium text-[#333]">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstname"
                {...register("firstname")}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
              {errors.firstname && (
                <p className="text-sm text-red-500">{errors.firstname.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastname" className="text-sm font-medium text-[#333]">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastname"
                {...register("lastname")}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
              {errors.lastname && (
                <p className="text-sm text-red-500">{errors.lastname.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[#333]">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Read-only fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#333]">Department</Label>
                <Input
                  value={user?.departmentName || "-"}
                  readOnly
                  className="border-[#ccc] bg-[#f8f8f8] text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#333]">Role</Label>
                <Input
                  value={user?.roleName || "-"}
                  readOnly
                  className="border-[#ccc] bg-[#f8f8f8] text-muted-foreground"
                />
              </div>
            </div>

            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-[#ccc]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#337ab7] text-white hover:bg-[#286090]"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
