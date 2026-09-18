import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { suppliers, users } from "@/lib/db/schema";
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
  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.id, parseInt(id)), ne(suppliers.status, "Deleted")));
  return { title: supplier ? `Supplier: ${supplier.name}` : "Supplier Not Found" };
}

export default async function SupplierDetailPage({ params }: Props) {
  await requirePageRead("/suppliers");
  const { id } = await params;
  const supplierId = parseInt(id);

  if (isNaN(supplierId)) notFound();

  const [supplier] = await db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      contactPerson: suppliers.contactPerson,
      phone: suppliers.phone,
      email: suppliers.email,
      status: suppliers.status,
      createdAt: suppliers.createdAt,
      updatedAt: suppliers.updatedAt,
      deletedAt: suppliers.deletedAt,
      createdBy: suppliers.createdBy,
      updatedBy: suppliers.updatedBy,
      deletedBy: suppliers.deletedBy,
      deletedReason: suppliers.deletedReason,
      createdByName: users.firstname,
    })
    .from(suppliers)
    .leftJoin(users, eq(suppliers.createdBy, users.id))
    .where(and(eq(suppliers.id, supplierId), ne(suppliers.status, "Deleted")));

  if (!supplier) notFound();

  const tz = await getAppTimezone();

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Supplier Details</h1>
          <p className="text-sm text-muted-foreground">
            View supplier information and details.
          </p>
        </div>
        <Link href="/suppliers">
          <Button variant="outline" size="sm" className="border-[#ccc]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Suppliers
          </Button>
        </Link>
      </div>

      {/* Detail Card */}
      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">
            Supplier Information
          </h2>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">ID</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{supplier.id}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Name</dt>
              <dd className="mt-1 text-sm font-semibold text-[#337ab7]">{supplier.name}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Contact Person</dt>
              <dd className="mt-1 text-sm text-foreground">{supplier.contactPerson || "-"}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Phone</dt>
              <dd className="mt-1 text-sm text-foreground">{supplier.phone || "-"}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Email</dt>
              <dd className="mt-1 text-sm text-foreground">{supplier.email || "-"}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <span
                  className={`inline-block px-2 py-0.5 text-xs font-medium ${
                    supplier.status === "Active"
                      ? "bg-[#5cb85c] text-white"
                      : "bg-[#999] text-white"
                  }`}
                >
                  {supplier.status}
                </span>
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Created At</dt>
              <dd className="mt-1 text-sm text-foreground">
                {formatDateOnly(supplier.createdAt, tz)}
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Updated At</dt>
              <dd className="mt-1 text-sm text-foreground">
                {supplier.updatedAt
                  ? formatDateOnly(supplier.updatedAt, tz)
                  : "-"}
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Created By</dt>
              <dd className="mt-1 text-sm text-foreground">{supplier.createdByName || "-"}</dd>
            </div>
            {supplier.deletedAt && (
              <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
                <dt className="text-xs font-semibold uppercase text-muted-foreground">Deleted At</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatDateOnly(supplier.deletedAt, tz)}
                </dd>
              </div>
            )}
            {supplier.deletedReason && (
              <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4 sm:col-span-2">
                <dt className="text-xs font-semibold uppercase text-muted-foreground">Deleted Reason</dt>
                <dd className="mt-1 text-sm text-foreground">{supplier.deletedReason}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
