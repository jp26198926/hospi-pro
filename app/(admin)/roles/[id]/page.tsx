import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { eq, ne, and } from "drizzle-orm";
import { getAppTimezone } from "@/lib/settings";
import { formatDateOnly } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { RolePermissionsTable } from "@/components/role-permissions/role-permissions-table";
import { requirePageRead } from "@/lib/api-auth";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [role] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, parseInt(id)), ne(roles.status, "Deleted")));
  return { title: role ? `Role: ${role.role}` : "Role Not Found" };
}

export default async function RoleDetailPage({ params }: Props) {
  await requirePageRead("/roles");
  const { id } = await params;
  const roleId = parseInt(id);

  if (isNaN(roleId)) notFound();

  const [role] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, roleId), ne(roles.status, "Deleted")));

  if (!role) notFound();

  const tz = await getAppTimezone();

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Role Details</h1>
          <p className="text-sm text-muted-foreground">
            Page Permission Settings.
          </p>
        </div>
        <Link href="/roles">
          <Button variant="outline" size="sm" className="border-[#ccc]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Roles
          </Button>
        </Link>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: Page Permission DataTable */}
        <div className="lg:col-span-2">
          <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
            <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
              <h2 className="text-sm font-semibold text-[#337ab7]">
                Page Permission Settings
              </h2>
            </div>
            <div className="p-4">
              <RolePermissionsTable roleId={roleId} />
            </div>
          </div>
        </div>

        {/* Right: Role Information */}
        <div className="lg:col-span-1">
          <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
            <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
              <h2 className="text-sm font-semibold text-[#337ab7]">
                Role Information
              </h2>
            </div>
            <div className="p-6">
              <dl className="space-y-4">
                <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">ID</dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">{role.id}</dd>
                </div>
                <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">Role Name</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">{role.role}</dd>
                </div>
                <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">Status</dt>
                  <dd className="mt-1">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium ${
                        role.status === "Active"
                          ? "bg-[#5cb85c] text-white"
                          : "bg-[#999] text-white"
                      }`}
                    >
                      {role.status}
                    </span>
                  </dd>
                </div>
                <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">Created At</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {formatDateOnly(role.createdAt, tz)}
                  </dd>
                </div>
                <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">Updated At</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {role.updatedAt
                      ? formatDateOnly(role.updatedAt, tz)
                      : "-"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
