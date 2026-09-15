import { PermissionsTable } from "@/components/permissions/permissions-table";

export const metadata = {
  title: "Permissions",
  description: "Manage system permissions",
};

export default function PermissionsPage() {
  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Permissions</h1>
          <p className="text-sm text-muted-foreground">
            Manage system permissions and access rights.
          </p>
        </div>
      </div>

      {/* Content Card */}
      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Permissions Management
          </h2>
        </div>
        <div className="p-4">
          <PermissionsTable />
        </div>
      </div>
    </div>
  );
}
