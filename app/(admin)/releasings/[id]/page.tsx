import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { releasings, locations, users } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getAppTimezone, getAppSettings } from "@/lib/settings";
import { requirePageRead } from "@/lib/api-auth";
import { formatReleasingNo } from "@/lib/validations/releasing-item";
import { formatUserDisplay } from "@/lib/format-user";
import { ReleasingDetailClient } from "@/components/releasings/releasing-detail-client";

const locFrom = alias(locations, "loc_from");
const locTo = alias(locations, "loc_to");

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const releasingId = parseInt(id);
  if (isNaN(releasingId)) return { title: "Releasing Not Found" };
  const [row] = await db
    .select({ id: releasings.id })
    .from(releasings)
    .where(eq(releasings.id, releasingId));
  return {
    title: row ? `Releasing: ${formatReleasingNo(row.id)}` : "Releasing Not Found",
  };
}

export default async function ReleasingDetailPage({ params }: Props) {
  await requirePageRead("/releasings");
  const { id } = await params;
  const releasingId = parseInt(id);
  if (isNaN(releasingId)) notFound();

  const [row] = await db
    .select({
      id: releasings.id,
      date: releasings.date,
      fromLocationId: releasings.fromLocationId,
      fromLocationName: locFrom.name,
      toLocationId: releasings.toLocationId,
      toLocationName: locTo.name,
      receiverName: releasings.receiverName,
      remarks: releasings.remarks,
      status: releasings.status,
      createdAt: releasings.createdAt,
      updatedAt: releasings.updatedAt,
      deletedAt: releasings.deletedAt,
      deletedReason: releasings.deletedReason,
      createdBy: releasings.createdBy,
      updatedBy: releasings.updatedBy,
      deletedBy: releasings.deletedBy,
    })
    .from(releasings)
    .innerJoin(locFrom, eq(releasings.fromLocationId, locFrom.id))
    .leftJoin(locTo, eq(releasings.toLocationId, locTo.id))
    .where(eq(releasings.id, releasingId));

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
    <ReleasingDetailClient
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
        transNo: formatReleasingNo(row.id),
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
