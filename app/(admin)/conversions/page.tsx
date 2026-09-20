import { ConversionsTable } from "@/components/conversions/conversions-table";
import { getAppTimezone, getAppSettings } from "@/lib/settings";
import { requirePageRead } from "@/lib/api-auth";

export const metadata = {
  title: "Conversions",
  description: "Product-to-product stock conversions",
};

export default async function ConversionsPage() {
  await requirePageRead("/conversions");
  const timezone = await getAppTimezone();
  const appSettings = await getAppSettings();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Conversions</h1>
          <p className="text-sm text-muted-foreground">
            Manage product-to-product stock conversions at a location.
          </p>
        </div>
      </div>

      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Conversions Management
          </h2>
        </div>
        <div className="p-4">
          <ConversionsTable
            timezone={timezone}
            appSettings={{
              appName: appSettings.appName,
              appLogo: appSettings.appLogo,
              address: appSettings.address,
              phone: appSettings.phone,
            }}
          />
        </div>
      </div>
    </div>
  );
}
