import { StockLevelsTable } from "@/components/stock-levels/stock-levels-table";
import { getAppTimezone } from "@/lib/settings";
import { requirePageRead } from "@/lib/api-auth";

export const metadata = {
  title: "Stock Level",
  description: "Current stock by product and location",
};

export default async function StockLevelsPage() {
  await requirePageRead("/stock-levels");
  const timezone = await getAppTimezone();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Stock Level</h1>
          <p className="text-sm text-muted-foreground">
            Current stock by product and location. Updated by inventory transactions.
          </p>
        </div>
      </div>

      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">Stock Level Management</h2>
        </div>
        <div className="p-4">
          <StockLevelsTable timezone={timezone} />
        </div>
      </div>
    </div>
  );
}
