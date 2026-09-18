import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { permissions } from "@/lib/db/schema";
import { eq, ne, and } from "drizzle-orm";
import { getAppTimezone } from "@/lib/settings";
import { formatDateOnly } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { requirePageRead } from "@/lib/api-auth";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [permission] = await db
    .select()
    .from(permissions)
    .where(and(eq(permissions.id, parseInt(id)), ne(permissions.status, "Deleted")));
  return { title: permission ? `Permission: ${permission.permission}` : "Permission Not Found" };
}

export default async function PermissionDetailPage({ params }: Props) {
  await requirePageRead("/permissions");
  const { id } = await params;
  const permissionId = parseInt(id);

  if (isNaN(permissionId)) notFound();

  const [permission] = await db
    .select()
    .from(permissions)
    .where(and(eq(permissions.id, permissionId), ne(permissions.status, "Deleted")));

  if (!permission) notFound();

  const tz = await getAppTimezone();

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Permission Details</h1>
          <p className="text-sm text-muted-foreground">
            View permission information and details.
          </p>
        </div>
        <Link href="/permissions">
          <Button variant="outline" size="sm" className="border-[#ccc]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Permissions
          </Button>
        </Link>
      </div>

      {/* Detail Card */}
      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Permission Information
          </h2>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">ID</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{permission.id}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Permission Name</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">{permission.permission}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <span
                  className={`inline-block px-2 py-0.5 text-xs font-medium ${
                    permission.status === "Active"
                      ? "bg-[#5cb85c] text-white"
                      : "bg-[#999] text-white"
                  }`}
                >
                  {permission.status}
                </span>
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Created At</dt>
              <dd className="mt-1 text-sm text-foreground">
                {formatDateOnly(permission.createdAt, tz)}
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Updated At</dt>
              <dd className="mt-1 text-sm text-foreground">
                {permission.updatedAt
                  ? formatDateOnly(permission.updatedAt, tz)
                  : "-"}
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Deleted At</dt>
              <dd className="mt-1 text-sm text-foreground">
                {permission.deletedAt
                  ? formatDateOnly(permission.deletedAt, tz)
                  : "-"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
