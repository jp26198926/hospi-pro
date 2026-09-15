import { SettingsCloudinaryForm } from "@/components/settings-cloudinary/settings-form";

export const metadata = {
  title: "Cloudinary Settings",
  description: "Configure Cloudinary storage settings",
};

export default function SettingsCloudinaryPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Cloudinary Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure Cloudinary cloud storage settings.
          </p>
        </div>
      </div>

      <SettingsCloudinaryForm />
    </div>
  );
}
