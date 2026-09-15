"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Upload, X, Image } from "lucide-react";
import { settingsAppSchema, SettingsAppInput } from "@/lib/validations/settings-application";

interface TimezoneOption {
  id: number;
  timezone: string;
}

interface CurrencyOption {
  id: number;
  code: string;
  name: string;
  symbol: string | null;
}

interface SettingsData {
  appLogo: string | null;
  appFavicon: string | null;
  appName: string;
  appTagline: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tinNo: string | null;
  timezoneId: number | null;
  currencyId: number | null;
  otpDuration: number | null;
  primaryStorage: string | null;
  downloadLinkAndroid: string | null;
  downloadLinkIos: string | null;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export function SettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timezones, setTimezones] = useState<TimezoneOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [cloudinaryConfigured, setCloudinaryConfigured] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SettingsAppInput>({
    resolver: zodResolver(settingsAppSchema),
    defaultValues: {
      appName: "RBAC System",
      primaryStorage: "filesystem",
    },
  });

  const timezoneIdValue = watch("timezoneId");
  const currencyIdValue = watch("currencyId");
  const primaryStorageValue = watch("primaryStorage");

  const storageOptions = [
    { value: "filesystem", label: "File System" },
    ...(cloudinaryConfigured ? [{ value: "cloudinary", label: "Cloudinary" }] : []),
  ];

  useEffect(() => {
    Promise.all([
      fetch("/api/settings-application").then((r) => r.json()),
      fetch("/api/timezones?limit=500").then((r) => r.json()),
      fetch("/api/currencies?limit=500").then((r) => r.json()),
      fetch("/api/settings-cloudinary").then((r) => r.json()),
    ]).then(([settingsJson, tzJson, curJson, cloudinaryJson]) => {
      if (settingsJson.data) {
        const s: SettingsData = settingsJson.data;
        reset({
          appLogo: s.appLogo || "",
          appFavicon: s.appFavicon || "",
          appName: s.appName || "RBAC System",
          appTagline: s.appTagline || "",
          email: s.email || "",
          phone: s.phone || "",
          address: s.address || "",
          tinNo: s.tinNo || "",
          timezoneId: s.timezoneId,
          currencyId: s.currencyId,
          otpDuration: s.otpDuration,
          primaryStorage: (s.primaryStorage as "filesystem" | "cloudinary") || "filesystem",
          downloadLinkAndroid: s.downloadLinkAndroid || "",
          downloadLinkIos: s.downloadLinkIos || "",
        });
        setValue("timezoneId", s.timezoneId);
        setValue("currencyId", s.currencyId);
        setLogoPreview(s.appLogo);
        setFaviconPreview(s.appFavicon);
      }
      if (tzJson.data) setTimezones(tzJson.data);
      if (curJson.data) setCurrencies(curJson.data);
      if (cloudinaryJson.data) {
        const c = cloudinaryJson.data;
        setCloudinaryConfigured(!!(c.cloudinaryName && c.cloudinaryApiKey && c.cloudinaryApiSecret));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [reset]);

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "settings-application");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Upload failed");
    }

    return json.url;
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: "appLogo" | "appFavicon"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be less than 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }

    try {
      const url = await uploadFile(file);
      setValue(fieldName, url);

      if (fieldName === "appLogo") {
        setLogoPreview(url);
      } else {
        setFaviconPreview(url);
      }
    } catch {
      toast.error("Failed to upload file");
    }
  };

  const handleRemoveFile = (fieldName: "appLogo" | "appFavicon") => {
    setValue(fieldName, null);
    if (fieldName === "appLogo") {
      setLogoPreview(null);
      if (logoInputRef.current) logoInputRef.current.value = "";
    } else {
      setFaviconPreview(null);
      if (faviconInputRef.current) faviconInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: SettingsAppInput) => {
    setSaving(true);
    try {
      const payload = { ...data };
      const res = await fetch("/api/settings-application", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Failed to save settings");
        return;
      }

      toast.success("Settings saved successfully");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const timezoneOptions = timezones.map((tz) => ({
    value: String(tz.id),
    label: tz.timezone,
  }));

  const currencyOptions = currencies.map((c) => ({
    value: String(c.id),
    label: c.symbol ? `${c.code} — ${c.name} (${c.symbol})` : `${c.code} — ${c.name}`,
  }));

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
      {/* App Info Section */}
      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h3 className="text-sm font-semibold text-[#337ab7]">Application Information</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="appName" className="text-sm font-medium text-[#333]">
              App Name <span className="text-red-500">*</span>
            </Label>
            <Input id="appName" {...register("appName")} className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]" />
            {errors.appName && <p className="text-sm text-red-500">{errors.appName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="appTagline" className="text-sm font-medium text-[#333]">App Tagline</Label>
            <Input id="appTagline" {...register("appTagline")} className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]" />
          </div>

          {/* App Logo Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">App Logo (max 2MB)</Label>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center border border-[#ddd] bg-[#fafafa]">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain" />
                ) : (
                  <Image className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "appLogo")}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  className="border-[#ccc]"
                >
                  <Upload className="mr-1 h-3 w-3" />
                  Upload Logo
                </Button>
                {logoPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile("appLogo")}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="mr-1 h-3 w-3" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Favicon Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Favicon (max 2MB)</Label>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center border border-[#ddd] bg-[#fafafa]">
                {faviconPreview ? (
                  <img src={faviconPreview} alt="Favicon preview" className="h-full w-full object-contain" />
                ) : (
                  <Image className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "appFavicon")}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => faviconInputRef.current?.click()}
                  className="border-[#ccc]"
                >
                  <Upload className="mr-1 h-3 w-3" />
                  Upload Favicon
                </Button>
                {faviconPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile("appFavicon")}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="mr-1 h-3 w-3" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h3 className="text-sm font-semibold text-[#337ab7]">Contact Information</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-[#333]">Email</Label>
            <Input id="email" type="email" {...register("email")} className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]" />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-[#333]">Phone</Label>
            <Input id="phone" {...register("phone")} className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address" className="text-sm font-medium text-[#333]">Address</Label>
            <Input id="address" {...register("address")} className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tinNo" className="text-sm font-medium text-[#333]">TIN No</Label>
            <Input id="tinNo" {...register("tinNo")} className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]" />
          </div>
        </div>
      </div>

      {/* System Section */}
      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h3 className="text-sm font-semibold text-[#337ab7]">System Settings</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Timezone</Label>
            <SearchableSelect
              options={timezoneOptions}
              value={timezoneIdValue ? String(timezoneIdValue) : ""}
              onValueChange={(val) => setValue("timezoneId", val ? Number(val) : null)}
              placeholder="Select timezone"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Default Currency</Label>
            <SearchableSelect
              options={currencyOptions}
              value={currencyIdValue ? String(currencyIdValue) : ""}
              onValueChange={(val) => setValue("currencyId", val ? Number(val) : null)}
              placeholder="Select currency"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="otpDuration" className="text-sm font-medium text-[#333]">OTP Duration (minutes)</Label>
            <Input id="otpDuration" type="number" {...register("otpDuration", { valueAsNumber: true })} className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#333]">Primary Storage</Label>
            <SearchableSelect
              options={storageOptions}
              value={primaryStorageValue || "filesystem"}
              onValueChange={(val) => setValue("primaryStorage", val as "filesystem" | "cloudinary")}
              placeholder="Select storage"
            />
            {!cloudinaryConfigured && (
              <p className="text-xs text-muted-foreground">
                Configure Cloudinary settings to enable cloud storage.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Download Links Section */}
      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h3 className="text-sm font-semibold text-[#337ab7]">Download Links</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="downloadLinkAndroid" className="text-sm font-medium text-[#333]">Android Download Link</Label>
            <Input id="downloadLinkAndroid" placeholder="https://..." {...register("downloadLinkAndroid")} className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="downloadLinkIos" className="text-sm font-medium text-[#333]">iOS Download Link</Label>
            <Input id="downloadLinkIos" placeholder="https://..." {...register("downloadLinkIos")} className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]" />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#337ab7] text-white hover:bg-[#286090]"
        >
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
            <p className="text-sm text-[#333]">Saving settings, please wait...</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
