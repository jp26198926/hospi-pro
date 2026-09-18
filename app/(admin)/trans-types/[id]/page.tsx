import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { transTypes } from "@/lib/db/schema";
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
  const [transType] = await db
    .select()
    .from(transTypes)
    .where(and(eq(transTypes.id, parseInt(id)), ne(transTypes.status, "Deleted")));
  return {
    title: transType ? `Trans Type: ${transType.name}` : "Trans Type Not Found",
  };
}

export default async function TransTypeDetailPage({ params }: Props) {
  await requirePageRead("/trans-types");
  const { id } = await params;
  const transTypeId = parseInt(id);

  if (isNaN(transTypeId)) notFound();

  const [transType] = await db
    .select()
    .from(transTypes)
    .where(and(eq(transTypes.id, transTypeId), ne(transTypes.status, "Deleted")));

  if (!transType) notFound();

  const tz = await getAppTimezone();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#337ab7]">Trans Type Details</h1>
          <p className="text-sm text-muted-foreground">
            View transaction type information and details.
          </p>
        </div>
        <Link href="/trans-types">
          <Button variant="outline" size="sm" className="border-[#ccc]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Trans Types
          </Button>
        </Link>
      </div>

      <div className="rounded-sm border border-[#ddd] bg-white shadow-sm">
        <div className="border-b border-[#ddd] bg-[#f8f8f8] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#337ab7]">Trans Type Information</h2>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">ID</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{transType.id}</dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Name
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#337ab7]">
                {transType.name}
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Status
              </dt>
              <dd className="mt-1">
                <span
                  className={`inline-block px-2 py-0.5 text-xs font-medium ${
                    transType.status === "Active"
                      ? "bg-[#5cb85c] text-white"
                      : "bg-[#999] text-white"
                  }`}
                >
                  {transType.status}
                </span>
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Created At
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {formatDateOnly(transType.createdAt, tz)}
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Updated At
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {transType.updatedAt ? formatDateOnly(transType.updatedAt, tz) : "-"}
              </dd>
            </div>
            <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-4">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Deleted At
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {transType.deletedAt ? formatDateOnly(transType.deletedAt, tz) : "-"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
