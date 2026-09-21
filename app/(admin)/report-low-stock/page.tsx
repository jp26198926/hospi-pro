import { ReportLowStockTable } from "@/components/report-low-stock/report-low-stock-table";
import { getAppTimezone, getAppSettings } from "@/lib/settings";
import { requirePageRead } from "@/lib/api-auth";

export const metadata = {
  title: "Report Low Stock",
  description: "Products at or below min stock by location",
};

export default async function ReportLowStockPage() {
  await requirePageRead("/report-low-stock");
  const timezone = await getAppTimezone();
  const appSettings = await getAppSettings();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Report Low Stock</h1>
          <p className="text-sm text-muted-foreground">
            Product/location rows where on-hand qty is at or below min stock.
          </p>
        </div>
      </div>

      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">Low Stock Report</h2>
        </div>
        <div className="p-4">
          <ReportLowStockTable
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
