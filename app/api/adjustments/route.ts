import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { adjustments, locations, products, uoms, users } from "@/lib/db/schema";
import { adjustmentSchema, formatAdjustmentNo } from "@/lib/validations/adjustment";
import { createAdjustment } from "@/lib/adjustment-stock";
import { formatUserDisplay } from "@/lib/format-user";
import { eq, desc, asc, ilike, and, or, inArray, gte, lte, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/adjustments", "Read");
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const status = searchParams.get("status") || "Completed";
    const locationId = searchParams.get("locationId") || "";
    const productId = searchParams.get("productId") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    const conditions = [];
    if (status === "Completed" || status === "Cancelled") {
      conditions.push(eq(adjustments.status, status));
    }
    if (locationId && locationId !== "all") {
      conditions.push(eq(adjustments.locationId, parseInt(locationId)));
    }
    if (productId && productId !== "all") {
      conditions.push(eq(adjustments.productId, parseInt(productId)));
    }
    if (dateFrom) {
      const from = new Date(`${dateFrom}T00:00:00.000Z`);
      if (!Number.isNaN(from.getTime())) {
        conditions.push(gte(adjustments.date, from));
      }
    }
    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59.999Z`);
      if (!Number.isNaN(to.getTime())) {
        conditions.push(lte(adjustments.date, to));
      }
    }
    if (search) {
      conditions.push(
        or(
          ilike(locations.name, `%${search}%`),
          ilike(products.code, `%${search}%`),
          ilike(products.name, `%${search}%`),
          ilike(adjustments.remarks, `%${search}%`)
        )
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "location"
        ? locations.name
        : sortBy === "product"
          ? products.code
          : sortBy === "status"
            ? adjustments.status
            : sortBy === "qtyAdj"
              ? adjustments.qtyAdj
              : sortBy === "createdAt"
                ? adjustments.createdAt
                : sortBy === "id"
                  ? adjustments.id
                  : adjustments.date;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
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
          createdByFirstname: users.firstname,
          createdByLastname: users.lastname,
        })
        .from(adjustments)
        .innerJoin(locations, eq(adjustments.locationId, locations.id))
        .innerJoin(products, eq(adjustments.productId, products.id))
        .innerJoin(uoms, eq(adjustments.uomId, uoms.id))
        .leftJoin(users, eq(adjustments.createdBy, users.id))
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ value: drizzleCount() })
        .from(adjustments)
        .innerJoin(locations, eq(adjustments.locationId, locations.id))
        .innerJoin(products, eq(adjustments.productId, products.id))
        .innerJoin(uoms, eq(adjustments.uomId, uoms.id))
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
        transNo: formatAdjustmentNo(row.id),
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
    console.error("GET /api/adjustments error:", error);
    return Response.json({ error: "Failed to fetch adjustments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/adjustments", "Add");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = adjustmentSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = await createAdjustment(
      {
        date: parsed.data.date,
        locationId: parsed.data.locationId,
        productId: parsed.data.productId,
        qtyAdj: parsed.data.qtyAdj,
        remarks: parsed.data.remarks || null,
      },
      auth.userId
    );

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/adjustments error:", error);
    return Response.json({ error: "Failed to create adjustment" }, { status: 500 });
  }
}
