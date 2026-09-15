import { SettingsForm } from "@/components/settings-application/settings-form";
import { requirePageRead } from "@/lib/api-auth";

export const metadata = {
  title: "Application Settings",
  description: "Configure application settings",
};

export default async function SettingsPage() {
  await requirePageRead("/settings-application");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Application Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure your application settings and preferences.
          </p>
        </div>
      </div>

      <SettingsForm />
    </div>
  );
}
