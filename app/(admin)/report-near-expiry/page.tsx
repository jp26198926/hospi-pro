import { ReportNearExpiryTable } from "@/components/report-near-expiry/report-near-expiry-table";
import { getAppTimezone, getAppSettings } from "@/lib/settings";
import { requirePageRead } from "@/lib/api-auth";

export const metadata = {
  title: "Report Near Expiry",
  description: "Inventory batches near expiry or expired",
};

export default async function ReportNearExpiryPage() {
  await requirePageRead("/report-near-expiry");
  const timezone = await getAppTimezone();
  const appSettings = await getAppSettings();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Report Near Expiry</h1>
          <p className="text-sm text-muted-foreground">
            Active lots expiring within N days (default 30), including already expired batches.
          </p>
        </div>
      </div>

      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">Near Expiry Report</h2>
        </div>
        <div className="p-4">
          <ReportNearExpiryTable
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
