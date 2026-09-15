import { DepartmentsTable } from "@/components/departments/departments-table";
import { getAppTimezone } from "@/lib/settings";

export const metadata = {
  title: "Departments",
  description: "Manage system departments",
};

export default async function DepartmentsPage() {
  const timezone = await getAppTimezone();
  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Departments</h1>
          <p className="text-sm text-muted-foreground">
            Manage system departments and organizational units.
          </p>
        </div>
      </div>

      {/* Content Card */}
      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Departments Management
          </h2>
        </div>
        <div className="p-4">
          <DepartmentsTable timezone={timezone} />
        </div>
      </div>
    </div>
  );
}
