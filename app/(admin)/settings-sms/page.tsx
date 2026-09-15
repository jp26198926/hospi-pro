import { SettingsSmsForm } from "@/components/settings-sms/settings-form";
import { requirePageRead } from "@/lib/api-auth";

export const metadata = {
  title: "SMS Settings",
  description: "Configure SMS gateway settings",
};

export default async function SettingsSmsPage() {
  await requirePageRead("/settings-sms");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">SMS Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure TextBee SMS gateway settings.
          </p>
        </div>
      </div>

      <SettingsSmsForm />
    </div>
  );
}
