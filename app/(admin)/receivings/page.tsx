import { ReceivingsTable } from "@/components/receivings/receivings-table";
import { getAppTimezone } from "@/lib/settings";
import { requirePageRead } from "@/lib/api-auth";

export const metadata = {
  title: "Receivings",
  description: "Goods receiving transactions",
};

export default async function ReceivingsPage() {
  await requirePageRead("/receivings");
  const timezone = await getAppTimezone();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Receivings</h1>
          <p className="text-sm text-muted-foreground">
            Manage goods receiving transactions.
          </p>
        </div>
      </div>

      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Receivings Management
          </h2>
        </div>
        <div className="p-4">
          <ReceivingsTable timezone={timezone} />
        </div>
      </div>
    </div>
  );
}
