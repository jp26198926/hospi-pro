import { UsersTable } from "@/components/users/users-table";

export const metadata = {
  title: "Users",
  description: "Manage system users",
};

export default function UsersPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage system users and accounts.
          </p>
        </div>
      </div>

      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Users Management
          </h2>
        </div>
        <div className="p-4">
          <UsersTable />
        </div>
      </div>
    </div>
  );
}
