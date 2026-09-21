import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { conversions, locations, products, uoms, users } from "@/lib/db/schema";
import { conversionSchema, formatConversionNo } from "@/lib/validations/conversion";
import { createConversion } from "@/lib/conversion-stock";
import { formatUserDisplay } from "@/lib/format-user";
import { eq, desc, asc, ilike, and, or, inArray, gte, lte, sql, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";
import { alias } from "drizzle-orm/pg-core";

const PHARMACY_LOCATION_NAME = "pharmacy";

const fp = alias(products, "from_product");
const tp = alias(products, "to_product");
const fu = alias(uoms, "from_uom");
const tu = alias(uoms, "to_uom");

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

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/phar-conversions", "Read");
    if (auth instanceof Response) return auth;

    const phar = await resolvePharmacyLocation();
    if (!phar) {
      return Response.json({ data: [], total: 0, page: 1, limit: 20 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const status = searchParams.get("status") || "all";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    // Always force pharmacy — client locationId is ignored
    const conditions = [eq(conversions.locationId, phar.id)];
    if (status === "Completed" || status === "Cancelled") {
      conditions.push(eq(conversions.status, status));
    }
    if (dateFrom) {
      const from = new Date(`${dateFrom}T00:00:00.000Z`);
      if (!Number.isNaN(from.getTime())) {
        conditions.push(gte(conversions.date, from));
      }
    }
    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59.999Z`);
      if (!Number.isNaN(to.getTime())) {
        conditions.push(lte(conversions.date, to));
      }
    }
    if (search) {
      const searchCond = or(
        ilike(fp.code, `%${search}%`),
        ilike(fp.name, `%${search}%`),
        ilike(tp.code, `%${search}%`),
        ilike(tp.name, `%${search}%`),
        ilike(conversions.remarks, `%${search}%`)
      );
      if (searchCond) conditions.push(searchCond);
    }
    const where = and(...conditions)!;

    const sortColumn =
      sortBy === "location"
        ? locations.name
        : sortBy === "status"
          ? conversions.status
          : sortBy === "id"
            ? conversions.id
            : sortBy === "fromProduct"
              ? fp.code
              : sortBy === "toProduct"
                ? tp.code
                : conversions.date;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const listQuery = () =>
      db
        .select({
          id: conversions.id,
          date: conversions.date,
          locationId: conversions.locationId,
          locationName: locations.name,
          fromProductId: conversions.fromProductId,
          fromProductCode: fp.code,
          fromProductName: fp.name,
          fromUomId: conversions.fromUomId,
          fromUomName: fu.name,
          fromQty: conversions.fromQty,
          toProductId: conversions.toProductId,
          toProductCode: tp.code,
          toProductName: tp.name,
          toUomId: conversions.toUomId,
          toUomName: tu.name,
          newQty: conversions.newQty,
          remarks: conversions.remarks,
          status: conversions.status,
          createdAt: conversions.createdAt,
          updatedAt: conversions.updatedAt,
          deletedAt: conversions.deletedAt,
          deletedReason: conversions.deletedReason,
          createdBy: conversions.createdBy,
          updatedBy: conversions.updatedBy,
          deletedBy: conversions.deletedBy,
        })
        .from(conversions)
        .innerJoin(locations, eq(conversions.locationId, locations.id))
        .innerJoin(fp, eq(conversions.fromProductId, fp.id))
        .innerJoin(fu, eq(conversions.fromUomId, fu.id))
        .innerJoin(tp, eq(conversions.toProductId, tp.id))
        .innerJoin(tu, eq(conversions.toUomId, tu.id))
        .where(where);

    const [data, countResult] = await Promise.all([
      listQuery()
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ value: drizzleCount() })
        .from(conversions)
        .innerJoin(locations, eq(conversions.locationId, locations.id))
        .innerJoin(fp, eq(conversions.fromProductId, fp.id))
        .innerJoin(fu, eq(conversions.fromUomId, fu.id))
        .innerJoin(tp, eq(conversions.toProductId, tp.id))
        .innerJoin(tu, eq(conversions.toUomId, tu.id))
        .where(where),
    ]);

    const userIds = [
      ...new Set(
        data.flatMap((row) =>
          [row.createdBy, row.updatedBy, row.deletedBy].filter(
            (v): v is number => typeof v === "number"
          )
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
      userRows.map((u) => [
        u.id,
        formatUserDisplay(u.firstname, u.lastname),
      ])
    );

    return Response.json({
      data: data.map((row) => ({
        ...row,
        transNo: formatConversionNo(row.id),
        createdByDisplay: row.createdBy
          ? userMap.get(row.createdBy) || null
          : null,
        updatedByDisplay: row.updatedBy
          ? userMap.get(row.updatedBy) || null
          : null,
        deletedByDisplay: row.deletedBy
          ? userMap.get(row.deletedBy) || null
          : null,
      })),
      total: countResult[0]?.value ?? 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("GET /api/phar-conversions error:", error);
    return Response.json({ error: "Failed to fetch pharmacy conversions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/phar-conversions", "Add");
    if (auth instanceof Response) return auth;

    const phar = await resolvePharmacyLocation();
    if (!phar) {
      return Response.json({ error: "Pharmacy location not found" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = conversionSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Force pharmacy location — do not trust client locationId
    const data = await createConversion(
      {
        date: parsed.data.date,
        locationId: phar.id,
        fromProductId: parsed.data.fromProductId,
        fromQty: parsed.data.fromQty,
        toProductId: parsed.data.toProductId,
        newQty: parsed.data.newQty,
        remarks: parsed.data.remarks || null,
      },
      auth.userId
    );

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create pharmacy conversion";
    console.error("POST /api/phar-conversions error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
