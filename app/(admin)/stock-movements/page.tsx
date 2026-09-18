import { StockMovementsTable } from "@/components/stock-movements/stock-movements-table";
import { getAppTimezone } from "@/lib/settings";
import { requirePageRead } from "@/lib/api-auth";

export const metadata = {
  title: "Stock Movement",
  description: "Stock movement trail by product and location",
};

export default async function StockMovementsPage() {
  await requirePageRead("/stock-movements");
  const timezone = await getAppTimezone();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Stock Movement</h1>
          <p className="text-sm text-muted-foreground">
            Stock movement trail. Rows are written by inventory transactions.
          </p>
        </div>
      </div>

      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Stock Movement Management
          </h2>
        </div>
        <div className="p-4">
          <StockMovementsTable timezone={timezone} />
        </div>
      </div>
    </div>
  );
}
