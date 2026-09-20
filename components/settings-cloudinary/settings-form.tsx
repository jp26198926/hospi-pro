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
import { Loader2, Upload } from "lucide-react";
import { settingsCloudinarySchema, SettingsCloudinaryInput } from "@/lib/validations/settings-cloudinary";

export function SettingsCloudinaryForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPreview, setTestPreview] = useState<string | null>(null);
  const [testFile, setTestFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsCloudinaryInput>({
    resolver: zodResolver(settingsCloudinarySchema),
  });

  useEffect(() => {
    fetch("/api/settings-cloudinary")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const s = json.data;
          reset({
            cloudinaryName: s.cloudinaryName || "",
            cloudinaryApiKey: s.cloudinaryApiKey || "",
            cloudinaryApiSecret: s.cloudinaryApiSecret || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (data: SettingsCloudinaryInput) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings-cloudinary", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Failed to save settings");
        return;
      }

      toast.success("Cloudinary settings saved successfully");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleTestFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTestFile(file);
    const url = URL.createObjectURL(file);
    setTestPreview(url);
  };

  const handleTestUpload = async () => {
    if (!testFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setTesting(true);
    try {
      const formData = new FormData();
      formData.append("file", testFile);

      const res = await fetch("/api/settings-cloudinary/test", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Upload failed");
        return;
      }

      toast.success("Test upload successful");
      setTestPreview(json.url);
      setTestFile(null);
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
        {/* Cloudinary Configuration */}
        <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
          <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#337ab7]">Cloudinary Configuration</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cloudinaryName" className="text-sm font-medium text-[#333]">
                Cloud Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cloudinaryName"
                placeholder="Enter your Cloudinary cloud name"
                {...register("cloudinaryName")}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
              {errors.cloudinaryName && (
                <p className="text-sm text-red-500">{errors.cloudinaryName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cloudinaryApiKey" className="text-sm font-medium text-[#333]">
                API Key <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cloudinaryApiKey"
                type="password"
                placeholder="Enter your Cloudinary API key"
                {...register("cloudinaryApiKey")}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
              {errors.cloudinaryApiKey && (
                <p className="text-sm text-red-500">{errors.cloudinaryApiKey.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cloudinaryApiSecret" className="text-sm font-medium text-[#333]">
                API Secret <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cloudinaryApiSecret"
                type="password"
                placeholder="Enter your Cloudinary API secret"
                {...register("cloudinaryApiSecret")}
                className="border-[#ccc] focus:border-[#337ab7] focus:ring-[#337ab7]"
              />
              {errors.cloudinaryApiSecret && (
                <p className="text-sm text-red-500">{errors.cloudinaryApiSecret.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Test Upload Section */}
        <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
          <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#337ab7]">Test Upload</h3>
          </div>
          <div className="p-4">
            <p className="mb-4 text-sm text-muted-foreground">
              Upload a test image to verify your Cloudinary configuration is working correctly.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#333]">Select Image</Label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleTestFileChange}
                  className="block w-full text-sm text-[#333] file:mr-3 file:rounded-none file:border-0 file:bg-[#f0f7ff] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#337ab7] hover:file:bg-[#e0f0ff]"
                />
                {testPreview && (
                  <div className="mt-2">
                    <img src={testPreview} alt="Preview" className="h-20 w-20 border border-[#ddd] object-cover" />
                  </div>
                )}
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  onClick={handleTestUpload}
                  disabled={testing || !testFile}
                  className="bg-[#5cb85c] text-white hover:bg-[#449d44]"
                >
                  {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Upload className="mr-1 h-3 w-3" />
                  Upload Test
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
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-xs rounded-sm border-[#ddd] p-0" showCloseButton={false}>
          <div className="flex items-center justify-between border-b border-[#ddd] bg-[#337ab7] px-4 py-3">
            <DialogTitle className="text-sm font-semibold text-white">Saving...</DialogTitle>
          </div>
          <div className="flex min-h-0 flex-1 flex-col items-center gap-3 p-6">
            <Loader2 className="h-8 w-8 animate-spin text-[#337ab7]" />
            <p className="text-sm text-[#333]">Saving Cloudinary settings, please wait...</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
