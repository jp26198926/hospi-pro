import { SettingsMailForm } from "@/components/settings-mail/settings-form";
import { requirePageRead } from "@/lib/api-auth";

export const metadata = {
  title: "Mail Settings",
  description: "Configure mail/SMTP settings",
};

export default async function SettingsMailPage() {
  await requirePageRead("/settings-mail");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Mail Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure SMTP server settings and email preferences.
          </p>
        </div>
      </div>

      <SettingsMailForm />
    </div>
  );
}
