"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Info } from "lucide-react";
import { settingsSmsSchema, SettingsSmsInput } from "@/lib/validations/settings-sms";

export function SettingsSmsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsSmsInput>({
    resolver: zodResolver(settingsSmsSchema),
  });

  useEffect(() => {
    fetch("/api/settings-sms")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const s = json.data;
          reset({
            textbeeApiKey: s.textbeeApiKey || "",
            textbeeDeviceId: s.textbeeDeviceId || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (data: SettingsSmsInput) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings-sms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Failed to save settings");
        return;
      }

      toast.success("SMS settings saved successfully");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleTestSms = async () => {
    if (!testPhone) {
      toast.error("Please enter a phone number");
      return;
    }

    setTesting(true);
    try {
      const res = await fetch("/api/settings-sms/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: testPhone }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Failed to send test SMS");
        return;
      }

      toast.success("Test SMS sent successfully");
      setTestPhone("");
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
        {/* TextBee Configuration */}
        <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
          <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#337ab7]">TextBee Configuration</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="textbeeApiKey" className="text-sm font-medium text-[#333]">
                API Key <span className="text-red-500">*</span>
              </Label>
              <Input
                id="textbeeApiKey"
                type="password"
                placeholder="Enter your TextBee API key"
                {...register("textbeeApiKey")}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
              {errors.textbeeApiKey && (
                <p className="text-sm text-red-500">{errors.textbeeApiKey.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="textbeeDeviceId" className="text-sm font-medium text-[#333]">
                Device ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="textbeeDeviceId"
                placeholder="Enter your TextBee device ID"
                {...register("textbeeDeviceId")}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
              {errors.textbeeDeviceId && (
                <p className="text-sm text-red-500">{errors.textbeeDeviceId.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Supported SMS Gateway Info */}
        <div className="rounded-sm border border-[#337ab7]/20 bg-[#f0f7ff] p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#337ab7]" />
            <div className="text-sm text-[#333]">
              <p className="font-semibold text-[#337ab7]">Supported SMS Gateway</p>
              <p className="mt-1">
                This application only supports{" "}
                <a href="https://textbee.dev" target="_blank" rel="noopener noreferrer" className="font-medium text-[#337ab7] underline">
                  TextBee
                </a>{" "}
                as the SMS gateway provider. You will need a TextBee account and an Android device
                running the TextBee app to send and receive SMS messages. Visit{" "}
                <a href="https://textbee.dev" target="_blank" rel="noopener noreferrer" className="font-medium text-[#337ab7] underline">
                  textbee.dev
                </a>{" "}
                to get started.
              </p>
            </div>
          </div>
        </div>

        {/* Test SMS Section */}
        <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
          <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#337ab7]">Test SMS</h3>
          </div>
          <div className="p-4">
            <p className="mb-4 text-sm text-muted-foreground">
              Send a test SMS to verify your TextBee configuration is working correctly.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="testPhone" className="text-sm font-medium text-[#333]">
                  Phone Number
                </Label>
                <Input
                  id="testPhone"
                  placeholder="e.g., +639123456789"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={handleTestSms}
                  disabled={testing}
                  className="bg-[#337ab7] text-white hover:bg-[#286090]"
                >
                  {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Test SMS
                </Button>
              </div>
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
        <DialogContent className="sm:max-w-xs rounded-sm border-[#ddd] p-0" showCloseButton={false}>
          <div className="flex items-center justify-between border-b border-[#ddd] bg-[#337ab7] px-4 py-3">
            <DialogTitle className="text-sm font-semibold text-white">Saving...</DialogTitle>
          </div>
          <div className="flex flex-col items-center gap-3 p-6">
            <Loader2 className="h-8 w-8 animate-spin text-[#337ab7]" />
            <p className="text-sm text-[#333]">Saving SMS settings, please wait...</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
