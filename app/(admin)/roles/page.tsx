import { RolesTable } from "@/components/roles/roles-table";

export const metadata = {
  title: "Roles",
  description: "Manage system roles",
};

export default function RolesPage() {
  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Roles</h1>
          <p className="text-sm text-muted-foreground">
            Manage system roles and their permissions.
          </p>
        </div>
      </div>

      {/* Content Card */}
      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Roles Management
          </h2>
        </div>
        <div className="p-4">
          <RolesTable />
        </div>
      </div>
    </div>
  );
}
