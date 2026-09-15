import { PagesTable } from "@/components/pages/pages-table";
import { requirePageRead } from "@/lib/api-auth";

export const metadata = {
  title: "Pages",
  description: "Manage system pages",
};

export default async function PagesIndexPage() {
  await requirePageRead("/pages");
  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Pages</h1>
          <p className="text-sm text-muted-foreground">
            Manage system pages and navigation.
          </p>
        </div>
      </div>

      {/* Content Card */}
      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Pages Management
          </h2>
        </div>
        <div className="p-4">
          <PagesTable />
        </div>
      </div>
    </div>
  );
}
