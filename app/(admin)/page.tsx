import Link from "next/link";
import { Shield, Users, Settings, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#337ab7]">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome to the RBAC Management System.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/roles" className="group">
          <div className="rounded-sm border border-[#ddd] bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#337ab7]">Roles</h3>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded bg-[#337ab7] text-white">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#333]">--</p>
                <p className="text-xs text-muted-foreground">Manage roles</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/users" className="group">
          <div className="rounded-sm border border-[#ddd] bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#337ab7]">Users</h3>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded bg-[#5cb85c] text-white">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#333]">--</p>
                <p className="text-xs text-muted-foreground">Manage users</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/reports" className="group">
          <div className="rounded-sm border border-[#ddd] bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#337ab7]">Reports</h3>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded bg-[#f0ad4e] text-white">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#333]">--</p>
                <p className="text-xs text-muted-foreground">View reports</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/settings" className="group">
          <div className="rounded-sm border border-[#ddd] bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#337ab7]">Settings</h3>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded bg-[#555] text-white">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#333]">--</p>
                <p className="text-xs text-muted-foreground">System settings</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">Quick Actions</h2>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/roles"
              className="inline-flex items-center gap-2 bg-[#337ab7] px-4 py-2 text-sm text-white hover:bg-[#286090]"
            >
              <Shield className="h-4 w-4" />
              Manage Roles
            </Link>
            <Link
              href="/users"
              className="inline-flex items-center gap-2 bg-[#5cb85c] px-4 py-2 text-sm text-white hover:bg-[#449d44]"
            >
              <Users className="h-4 w-4" />
              Manage Users
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
