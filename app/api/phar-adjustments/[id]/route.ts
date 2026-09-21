import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { adjustments, locations, products, uoms, users } from "@/lib/db/schema";
import { formatAdjustmentNo } from "@/lib/validations/adjustment";
import { cancelAdjustment } from "@/lib/adjustment-stock";
import { formatUserDisplay } from "@/lib/format-user";
import { eq, and, sql, inArray } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

const PHARMACY_LOCATION_NAME = "pharmacy";

async function resolvePharmacyLocation() {
  const [phar] = await db
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(
      and(
        eq(locations.status, "Active"),
        sql`lower(${locations.name}) = ${PHARMACY_LOCATION_NAME}`
      )
    );
  return phar ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/phar-adjustments", "Read");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const adjustmentId = parseInt(id);
    if (isNaN(adjustmentId)) {
      return Response.json({ error: "Invalid adjustment ID" }, { status: 400 });
    }

    const phar = await resolvePharmacyLocation();
    if (!phar) {
      return Response.json({ error: "Adjustment not found" }, { status: 404 });
    }

    const [row] = await db
      .select({
        id: adjustments.id,
        date: adjustments.date,
        locationId: adjustments.locationId,
        locationName: locations.name,
        productId: adjustments.productId,
        productCode: products.code,
        productName: products.name,
        uomId: adjustments.uomId,
        uomName: uoms.name,
        qtyOld: adjustments.qtyOld,
        qtyAdj: adjustments.qtyAdj,
        qtyNew: adjustments.qtyNew,
        remarks: adjustments.remarks,
        status: adjustments.status,
        createdAt: adjustments.createdAt,
        updatedAt: adjustments.updatedAt,
        deletedAt: adjustments.deletedAt,
        deletedReason: adjustments.deletedReason,
        createdBy: adjustments.createdBy,
        updatedBy: adjustments.updatedBy,
        deletedBy: adjustments.deletedBy,
      })
      .from(adjustments)
      .innerJoin(locations, eq(adjustments.locationId, locations.id))
      .innerJoin(products, eq(adjustments.productId, products.id))
      .innerJoin(uoms, eq(adjustments.uomId, uoms.id))
      .where(eq(adjustments.id, adjustmentId));

    if (!row || row.locationId !== phar.id) {
      return Response.json({ error: "Adjustment not found" }, { status: 404 });
    }

    const userIds = [
      ...new Set(
        [row.createdBy, row.updatedBy, row.deletedBy].filter(
          (v): v is number => typeof v === "number"
        )
      ),
    ];
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

    return Response.json({
      data: {
        ...row,
        transNo: formatAdjustmentNo(row.id),
        createdByDisplay: row.createdBy ? userMap.get(row.createdBy) || null : null,
        updatedByDisplay: row.updatedBy ? userMap.get(row.updatedBy) || null : null,
        deletedByDisplay: row.deletedBy ? userMap.get(row.deletedBy) || null : null,
      },
    });
  } catch (error) {
    console.error("GET /api/phar-adjustments/[id] error:", error);
    return Response.json({ error: "Failed to fetch pharmacy adjustment" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/phar-adjustments", "Delete");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const adjustmentId = parseInt(id);
    if (isNaN(adjustmentId)) {
      return Response.json({ error: "Invalid adjustment ID" }, { status: 400 });
    }

    const phar = await resolvePharmacyLocation();
    if (!phar) {
      return Response.json({ error: "Adjustment not found" }, { status: 404 });
    }

    const [existing] = await db
      .select({ id: adjustments.id, locationId: adjustments.locationId })
      .from(adjustments)
      .where(eq(adjustments.id, adjustmentId));

    if (!existing || existing.locationId !== phar.id) {
      return Response.json({ error: "Adjustment not found" }, { status: 404 });
    }

    let deletedReason: string | null = null;
    try {
      const body = await request.json();
      if (body?.reason) deletedReason = String(body.reason);
    } catch {
      // no body
    }

    await cancelAdjustment(adjustmentId, auth.userId, deletedReason);
    return Response.json({ message: "Adjustment cancelled and stock reversed" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel adjustment";
    console.error("DELETE /api/phar-adjustments/[id] error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
