import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { conversions, locations, products, uoms, users } from "@/lib/db/schema";
import { conversionSchema, formatConversionNo } from "@/lib/validations/conversion";
import { createConversion } from "@/lib/conversion-stock";
import { formatUserDisplay } from "@/lib/format-user";
import { eq, desc, asc, ilike, and, or, inArray, gte, lte, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

const fromProd = products;
const toProd = products;
const fromUom = uoms;
const toUom = uoms;

import { alias } from "drizzle-orm/pg-core";

const fp = alias(products, "from_product");
const tp = alias(products, "to_product");
const fu = alias(uoms, "from_uom");
const tu = alias(uoms, "to_uom");

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/conversions", "Read");
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const status = searchParams.get("status") || "Completed";
    const locationId = searchParams.get("locationId") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    void fromProd;
    void toProd;
    void fromUom;
    void toUom;

    const conditions = [];
    if (status === "Completed" || status === "Cancelled") {
      conditions.push(eq(conversions.status, status));
    }
    if (locationId && locationId !== "all") {
      conditions.push(eq(conversions.locationId, parseInt(locationId)));
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
      conditions.push(
        or(
          ilike(locations.name, `%${search}%`),
          ilike(fp.code, `%${search}%`),
          ilike(fp.name, `%${search}%`),
          ilike(tp.code, `%${search}%`),
          ilike(tp.name, `%${search}%`),
          ilike(conversions.remarks, `%${search}%`)
        )
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

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

    const [data, countResult] = await Promise.all([
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
          createdByFirstname: users.firstname,
          createdByLastname: users.lastname,
        })
        .from(conversions)
        .innerJoin(locations, eq(conversions.locationId, locations.id))
        .innerJoin(fp, eq(conversions.fromProductId, fp.id))
        .innerJoin(fu, eq(conversions.fromUomId, fu.id))
        .innerJoin(tp, eq(conversions.toProductId, tp.id))
        .innerJoin(tu, eq(conversions.toUomId, tu.id))
        .leftJoin(users, eq(conversions.createdBy, users.id))
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ value: drizzleCount() })
        .from(conversions)
        .innerJoin(locations, eq(conversions.locationId, locations.id))
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
    console.error("GET /api/conversions error:", error);
    return Response.json({ error: "Failed to fetch conversions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/conversions", "Add");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = conversionSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = await createConversion(
      {
        date: parsed.data.date,
        locationId: parsed.data.locationId,
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
      error instanceof Error ? error.message : "Failed to create conversion";
    console.error("POST /api/conversions error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
