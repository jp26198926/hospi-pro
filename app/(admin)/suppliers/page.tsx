import { SuppliersTable } from "@/components/suppliers/suppliers-table";
import { getAppTimezone } from "@/lib/settings";
import { requirePageRead } from "@/lib/api-auth";

export const metadata = {
  title: "Suppliers",
  description: "Manage system suppliers",
};

export default async function SuppliersPage() {
  await requirePageRead("/suppliers");
  const timezone = await getAppTimezone();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Manage system suppliers.
          </p>
        </div>
      </div>

      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Suppliers Management
          </h2>
        </div>
        <div className="p-4">
          <SuppliersTable timezone={timezone} />
        </div>
      </div>
    </div>
  );
}
