import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { gstTypes, users } from "@/lib/db/schema";
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
  const [gstType] = await db
    .select()
    .from(gstTypes)
    .where(and(eq(gstTypes.id, parseInt(id)), ne(gstTypes.status, "Deleted")));
  return { title: gstType ? `GST Type: ${gstType.code}` : "GST Type Not Found" };
}

export default async function GstTypeDetailPage({ params }: Props) {
  await requirePageRead("/gst-types");
  const { id } = await params;
  const gstTypeId = parseInt(id);

  if (isNaN(gstTypeId)) notFound();

  const [gstType] = await db
    .select({
      id: gstTypes.id,
      code: gstTypes.code,
      name: gstTypes.name,
      status: gstTypes.status,
      createdAt: gstTypes.createdAt,
      updatedAt: gstTypes.updatedAt,
      deletedAt: gstTypes.deletedAt,
      deletedReason: gstTypes.deletedReason,
      createdByName: users.firstname,
    })
    .from(gstTypes)
    .leftJoin(users, eq(gstTypes.createdBy, users.id))
    .where(and(eq(gstTypes.id, gstTypeId), ne(gstTypes.status, "Deleted")));

  if (!gstType) notFound();

  const tz = await getAppTimezone();

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">GST Type Details</h1>
          <p className="text-sm text-muted-foreground">
            View GST type information and details.
          </p>
        </div>
        <Link href="/gst-types">
          <Button variant="outline" size="sm" className="border-[#ccc]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to GST Types
          </Button>
        </Link>
      </div>

      {/* Detail Card */}
      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            GST Type Information
          </h2>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">ID</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{gstType.id}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Code</dt>
              <dd className="mt-1 text-sm font-semibold text-[#337ab7]">{gstType.code}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Name</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">{gstType.name}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <span
                  className={`inline-block px-2 py-0.5 text-xs font-medium ${
                    gstType.status === "Active"
                      ? "bg-[#5cb85c] text-white"
                      : "bg-[#999] text-white"
                  }`}
                >
                  {gstType.status}
                </span>
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Created At</dt>
              <dd className="mt-1 text-sm text-foreground">
                {formatDateOnly(gstType.createdAt, tz)}
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Created By</dt>
              <dd className="mt-1 text-sm text-foreground">{gstType.createdByName || "-"}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Updated At</dt>
              <dd className="mt-1 text-sm text-foreground">
                {gstType.updatedAt
                  ? formatDateOnly(gstType.updatedAt, tz)
                  : "-"}
              </dd>
            </div>
            {gstType.deletedAt && (
              <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
                <dt className="text-xs font-semibold uppercase text-muted-foreground">Deleted At</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatDateOnly(gstType.deletedAt, tz)}
                </dd>
              </div>
            )}
            {gstType.deletedReason && (
              <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4 sm:col-span-2">
                <dt className="text-xs font-semibold uppercase text-muted-foreground">Deleted Reason</dt>
                <dd className="mt-1 text-sm text-foreground">{gstType.deletedReason}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
