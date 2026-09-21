import { PharStockLevelsTable } from "@/components/phar-stock-levels/phar-stock-levels-table";
import { getAppTimezone } from "@/lib/settings";
import { requirePageRead } from "@/lib/api-auth";

export const metadata = {
  title: "Phar Stock Levels",
  description: "Current stock at the pharmacy location only",
};

export default async function PharStockLevelsPage() {
  await requirePageRead("/phar-stock-levels");
  const timezone = await getAppTimezone();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Phar Stock Levels</h1>
          <p className="text-sm text-muted-foreground">
            Current stock by product at the <strong>pharmacy</strong> location only.
          </p>
        </div>
      </div>

      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">Phar Stock Level Management</h2>
        </div>
        <div className="p-4">
          <PharStockLevelsTable timezone={timezone} />
        </div>
      </div>
    </div>
  );
}
