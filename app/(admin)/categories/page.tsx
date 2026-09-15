import { CategoriesTable } from "@/components/categories/categories-table";
import { getAppTimezone } from "@/lib/settings";

export const metadata = {
  title: "Categories",
  description: "Manage system categories",
};

export default async function CategoriesPage() {
  const timezone = await getAppTimezone();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[#337ab7]">Categories</h1>
        <p className="text-sm text-muted-foreground">Manage system categories.</p>
      </div>
      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">Categories Management</h2>
        </div>
        <div className="p-4">
          <CategoriesTable timezone={timezone} />
        </div>
      </div>
    </div>
  );
}
