import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { receivings, suppliers, locations, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAppTimezone } from "@/lib/settings";
import { requirePageRead } from "@/lib/api-auth";
import { formatReceivingNo } from "@/lib/validations/receiving-item";
import { ReceivingDetailClient } from "@/components/receivings/receiving-detail-client";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const receivingId = parseInt(id);
  if (isNaN(receivingId)) return { title: "Receiving Not Found" };
  const [row] = await db
    .select({ id: receivings.id })
    .from(receivings)
    .where(eq(receivings.id, receivingId));
  return {
    title: row ? `Receiving: ${formatReceivingNo(row.id)}` : "Receiving Not Found",
  };
}

export default async function ReceivingDetailPage({ params }: Props) {
  await requirePageRead("/receivings");
  const { id } = await params;
  const receivingId = parseInt(id);
  if (isNaN(receivingId)) notFound();

  const [row] = await db
    .select({
      id: receivings.id,
      date: receivings.date,
      supplierId: receivings.supplierId,
      supplierName: suppliers.name,
      locationId: receivings.locationId,
      locationName: locations.name,
      poNumber: receivings.poNumber,
      invoiceNumber: receivings.invoiceNumber,
      remarks: receivings.remarks,
      status: receivings.status,
      createdAt: receivings.createdAt,
      updatedAt: receivings.updatedAt,
      cancelledAt: receivings.cancelledAt,
      cancelledReason: receivings.cancelledReason,
      createdByEmail: users.email,
    })
    .from(receivings)
    .innerJoin(suppliers, eq(receivings.supplierId, suppliers.id))
    .innerJoin(locations, eq(receivings.locationId, locations.id))
    .leftJoin(users, eq(receivings.createdBy, users.id))
    .where(eq(receivings.id, receivingId));

  if (!row) notFound();

  const timezone = await getAppTimezone();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Link href="/receivings">
          <Button variant="outline" size="sm" className="border-[#ccc]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Receivings
          </Button>
        </Link>
      </div>
      <ReceivingDetailClient
        initial={{ ...row, transNo: formatReceivingNo(row.id) }}
        timezone={timezone}
      />
    </div>
  );
}
