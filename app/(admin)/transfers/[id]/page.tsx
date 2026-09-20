import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { transfers, locations, users } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getAppTimezone, getAppSettings } from "@/lib/settings";
import { requirePageRead } from "@/lib/api-auth";
import { formatTransferNo } from "@/lib/validations/transfer-item";
import { formatUserDisplay } from "@/lib/format-user";
import { TransferDetailClient } from "@/components/transfers/transfer-detail-client";

const locFrom = alias(locations, "loc_from");
const locTo = alias(locations, "loc_to");

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const transferId = parseInt(id);
  if (isNaN(transferId)) return { title: "Transfer Not Found" };
  const [row] = await db
    .select({ id: transfers.id })
    .from(transfers)
    .where(eq(transfers.id, transferId));
  return {
    title: row ? `Transfer: ${formatTransferNo(row.id)}` : "Transfer Not Found",
  };
}

export default async function TransferDetailPage({ params }: Props) {
  await requirePageRead("/transfers");
  const { id } = await params;
  const transferId = parseInt(id);
  if (isNaN(transferId)) notFound();

  const [row] = await db
    .select({
      id: transfers.id,
      date: transfers.date,
      fromLocationId: transfers.fromLocationId,
      fromLocationName: locFrom.name,
      toLocationId: transfers.toLocationId,
      toLocationName: locTo.name,
      remarks: transfers.remarks,
      status: transfers.status,
      createdAt: transfers.createdAt,
      updatedAt: transfers.updatedAt,
      deletedAt: transfers.deletedAt,
      deletedReason: transfers.deletedReason,
      createdBy: transfers.createdBy,
      updatedBy: transfers.updatedBy,
      deletedBy: transfers.deletedBy,
    })
    .from(transfers)
    .innerJoin(locFrom, eq(transfers.fromLocationId, locFrom.id))
    .innerJoin(locTo, eq(transfers.toLocationId, locTo.id))
    .where(eq(transfers.id, transferId));

  if (!row) notFound();

  const userIds = [row.createdBy, row.updatedBy, row.deletedBy].filter(
    (v): v is number => typeof v === "number"
  );
  const userRows = userIds.length
    ? await db
        .select({
          id: users.id,
          firstname: users.firstname,
          lastname: users.lastname,
        })
        .from(users)
        .where(inArray(users.id, userIds))
    : [];
  const userMap = new Map(
    userRows.map((u) => [u.id, formatUserDisplay(u.firstname, u.lastname)])
  );

  const timezone = await getAppTimezone();
  const appSettings = await getAppSettings();

  return (
    <TransferDetailClient
      initial={{
        ...row,
        createdByDisplay: row.createdBy
          ? userMap.get(row.createdBy) || "-"
          : "-",
        updatedByDisplay: row.updatedBy
          ? userMap.get(row.updatedBy) || "-"
          : "-",
        deletedByDisplay: row.deletedBy
          ? userMap.get(row.deletedBy) || "-"
          : "-",
        transNo: formatTransferNo(row.id),
      }}
      timezone={timezone}
      appSettings={{
        appName: appSettings.appName,
        appLogo: appSettings.appLogo,
        address: appSettings.address,
        phone: appSettings.phone,
      }}
    />
  );
}
