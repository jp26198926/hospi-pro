import { SettingsCloudinaryForm } from "@/components/settings-cloudinary/settings-form";
import { requirePageRead } from "@/lib/api-auth";

export const metadata = {
  title: "Cloudinary Settings",
  description: "Configure Cloudinary storage settings",
};

export default async function SettingsCloudinaryPage() {
  await requirePageRead("/settings-cloudinary");
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
