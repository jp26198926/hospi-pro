import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { receivings, suppliers, locations, users } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getAppTimezone, getAppSettings } from "@/lib/settings";
import { requirePageRead } from "@/lib/api-auth";
import { formatReceivingNo } from "@/lib/validations/receiving-item";
import { formatUserDisplay } from "@/lib/receivings";
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
      deletedAt: receivings.deletedAt,
      deletedReason: receivings.deletedReason,
      createdBy: receivings.createdBy,
      updatedBy: receivings.updatedBy,
      deletedBy: receivings.deletedBy,
    })
    .from(receivings)
    .innerJoin(suppliers, eq(receivings.supplierId, suppliers.id))
    .innerJoin(locations, eq(receivings.locationId, locations.id))
    .where(eq(receivings.id, receivingId));

  if (!row) notFound();

  const userIds = [row.createdBy, row.updatedBy, row.deletedBy].filter(
    (v): v is number => typeof v === "number"
  );
  const userRows = userIds.length
    ? await db
        .select({ id: users.id, firstname: users.firstname, lastname: users.lastname })
        .from(users)
        .where(inArray(users.id, userIds))
    : [];
  const userMap = new Map(
    userRows.map((u) => [u.id, formatUserDisplay(u.firstname, u.lastname)])
  );

  const timezone = await getAppTimezone();
  const appSettings = await getAppSettings();

  return (
    <div className="space-y-4">
      <ReceivingDetailClient
        initial={{
          ...row,
          createdByEmail: null,
          createdByDisplay: row.createdBy ? userMap.get(row.createdBy) || "-" : "-",
          updatedByDisplay: row.updatedBy ? userMap.get(row.updatedBy) || "-" : "-",
          deletedByDisplay: row.deletedBy ? userMap.get(row.deletedBy) || "-" : "-",
          transNo: formatReceivingNo(row.id),
        }}
        timezone={timezone}
        appSettings={{
          appName: appSettings.appName,
          appLogo: appSettings.appLogo,
          address: appSettings.address,
          phone: appSettings.phone,
          appTagline: appSettings.appTagline,
        }}
      />
    </div>
  );
}
