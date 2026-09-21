import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { stockMovements, transTypes, products, locations, users } from "@/lib/db/schema";
import { eq, desc, asc, ilike, and, or, gte, lte, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";
import { formatUserDisplay } from "@/lib/format-user";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/stock-movements", "Read");
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const transTypeId = searchParams.get("transTypeId") || "";
    const productId = searchParams.get("productId") || "";
    const locationId = searchParams.get("locationId") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    const conditions = [];
    if (transTypeId && transTypeId !== "all") {
      conditions.push(eq(stockMovements.transTypeId, parseInt(transTypeId)));
    }
    if (productId && productId !== "all") {
      conditions.push(eq(stockMovements.productId, parseInt(productId)));
    }
    if (locationId && locationId !== "all") {
      conditions.push(eq(stockMovements.locationId, parseInt(locationId)));
    }
    if (dateFrom) {
      const from = new Date(`${dateFrom}T00:00:00.000Z`);
      if (!Number.isNaN(from.getTime())) {
        conditions.push(gte(stockMovements.date, from));
      }
    }
    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59.999Z`);
      if (!Number.isNaN(to.getTime())) {
        conditions.push(lte(stockMovements.date, to));
      }
    }
    if (search) {
      conditions.push(
        or(
          ilike(transTypes.name, `%${search}%`),
          ilike(products.code, `%${search}%`),
          ilike(products.name, `%${search}%`),
          ilike(locations.name, `%${search}%`),
          ilike(stockMovements.referenceDescription, `%${search}%`)
        )
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "transType"
        ? transTypes.name
        : sortBy === "productCode"
          ? products.code
          : sortBy === "productName"
            ? products.name
            : sortBy === "qty"
              ? stockMovements.qty
              : sortBy === "location"
                ? locations.name
                : sortBy === "referenceDescription"
                  ? stockMovements.referenceDescription
                  : sortBy === "createdAt"
                    ? stockMovements.createdAt
                    : sortBy === "createdBy"
                      ? users.lastname
                      : stockMovements.date;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: stockMovements.id,
          date: stockMovements.date,
          transTypeId: stockMovements.transTypeId,
          transTypeName: transTypes.name,
          productId: stockMovements.productId,
          productCode: products.code,
          productName: products.name,
          locationId: stockMovements.locationId,
          locationName: locations.name,
          qty: stockMovements.qty,
          referenceTransId: stockMovements.referenceTransId,
          referenceItemId: stockMovements.referenceItemId,
          referenceDescription: stockMovements.referenceDescription,
          remarks: stockMovements.remarks,
          createdAt: stockMovements.createdAt,
          createdBy: stockMovements.createdBy,
          createdByEmail: users.email,
          createdByFirstname: users.firstname,
          createdByLastname: users.lastname,
        })
        .from(stockMovements)
        .innerJoin(transTypes, eq(stockMovements.transTypeId, transTypes.id))
        .innerJoin(products, eq(stockMovements.productId, products.id))
        .innerJoin(locations, eq(stockMovements.locationId, locations.id))
        .leftJoin(users, eq(stockMovements.createdBy, users.id))
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ value: drizzleCount() })
        .from(stockMovements)
        .innerJoin(transTypes, eq(stockMovements.transTypeId, transTypes.id))
        .innerJoin(products, eq(stockMovements.productId, products.id))
        .innerJoin(locations, eq(stockMovements.locationId, locations.id))
        .where(where),
    ]);

    const total = countResult[0]?.value ?? 0;

    return Response.json({
      data: data.map((row) => ({
        ...row,
        createdByDisplay: formatUserDisplay(row.createdByFirstname, row.createdByLastname),
      })),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("GET /api/stock-movements error:", error);
    return Response.json({ error: "Failed to fetch stock movements" }, { status: 500 });
  }
}
