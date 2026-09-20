"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { settingsMailSchema, SettingsMailInput } from "@/lib/validations/settings-mail";

export function SettingsMailForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SettingsMailInput>({
    resolver: zodResolver(settingsMailSchema),
  });

  const smtpCryptoValue = watch("smtpCrypto");

  useEffect(() => {
    fetch("/api/settings-mail")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const s = json.data;
          reset({
            smtpHost: s.smtpHost || "",
            smtpPort: s.smtpPort,
            smtpUsername: s.smtpUsername || "",
            smtpPassword: s.smtpPassword || "",
            smtpFromEmail: s.smtpFromEmail || "",
            smtpSenderName: s.smtpSenderName || "",
            smtpCrypto: s.smtpCrypto || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (data: SettingsMailInput) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings-mail", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Failed to save settings");
        return;
      }

      toast.success("Mail settings saved successfully");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error("Please enter a recipient email");
      return;
    }

    setTesting(true);
    try {
      const res = await fetch("/api/settings-mail/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: testEmail }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Failed to send test email");
        return;
      }

      toast.success("Test email sent successfully");
      setTestEmail("");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* SMTP Server Section */}
        <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
          <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#337ab7]">SMTP Server</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtpHost" className="text-sm font-medium text-[#333]">SMTP Host</Label>
              <Input id="smtpHost" placeholder="smtp.gmail.com" {...register("smtpHost")} className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPort" className="text-sm font-medium text-[#333]">SMTP Port</Label>
              <Input id="smtpPort" type="number" placeholder="587" {...register("smtpPort", { valueAsNumber: true })} className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpUsername" className="text-sm font-medium text-[#333]">Username</Label>
              <Input id="smtpUsername" placeholder="your-email@gmail.com" {...register("smtpUsername")} className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPassword" className="text-sm font-medium text-[#333]">Password</Label>
              <Input id="smtpPassword" type="password" placeholder="••••••••" {...register("smtpPassword")} className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]" />
            </div>
          </div>
        </div>

        {/* Email Section */}
        <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
          <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#337ab7]">Email</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtpFromEmail" className="text-sm font-medium text-[#333]">From Email</Label>
              <Input id="smtpFromEmail" type="email" placeholder="noreply@example.com" {...register("smtpFromEmail")} className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]" />
              {errors.smtpFromEmail && <p className="text-sm text-red-500">{errors.smtpFromEmail.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpSenderName" className="text-sm font-medium text-[#333]">Sender Name</Label>
              <Input id="smtpSenderName" placeholder="RBAC System" {...register("smtpSenderName")} className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]" />
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
          <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#337ab7]">Security</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#333]">Encryption</Label>
              <Select
                value={smtpCryptoValue || "none"}
                onValueChange={(val) => setValue("smtpCrypto", val === "none" ? null : val)}
              >
                <SelectTrigger className="w-full border-[#ccc]">
                  <SelectValue>
                    {smtpCryptoValue || "None"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="SSL">SSL</SelectItem>
                  <SelectItem value="TLS">TLS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Test Email Section */}
        <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
          <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#337ab7]">Test Email</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="testEmail" className="text-sm font-medium text-[#333]">Recipient Email</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={handleTestEmail}
                disabled={testing}
                className="bg-[#5cb85c] text-white hover:bg-[#449d44]"
              >
                {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Test Email
              </Button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting} className="bg-[#337ab7] text-white hover:bg-[#286090]">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </form>

      {/* Saving Loading Modal */}
      <Dialog open={saving} onOpenChange={() => {}}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-xs rounded-sm border-[#ddd] p-0" showCloseButton={false}>
          <div className="flex items-center justify-between border-b border-[#ddd] bg-[#337ab7] px-4 py-3">
            <DialogTitle className="text-sm font-semibold text-white">Saving...</DialogTitle>
          </div>
          <div className="flex min-h-0 flex-1 flex-col items-center gap-3 p-6">
            <Loader2 className="h-8 w-8 animate-spin text-[#337ab7]" />
            <p className="text-sm text-[#333]">Saving mail settings, please wait...</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
