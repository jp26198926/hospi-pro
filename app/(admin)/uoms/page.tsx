import { UomsTable } from "@/components/uoms/uoms-table";
import { getAppTimezone } from "@/lib/settings";
import { requirePageRead } from "@/lib/api-auth";

export const metadata = {
  title: "UOM",
  description: "Manage units of measure",
};

export default async function UomsPage() {
  await requirePageRead("/uoms");
  const timezone = await getAppTimezone();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">UOM</h1>
          <p className="text-sm text-muted-foreground">
            Manage units of measure.
          </p>
        </div>
      </div>

      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            UOM Management
          </h2>
        </div>
        <div className="p-4">
          <UomsTable timezone={timezone} />
        </div>
      </div>
    </div>
  );
}
