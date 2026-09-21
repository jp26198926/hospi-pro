import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { stockLevels, products, locations, users } from "@/lib/db/schema";
import { eq, desc, asc, ilike, and, or, gte, lte, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";
import { formatUserDisplay } from "@/lib/format-user";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/stock-levels", "Read");
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "updatedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const productId = searchParams.get("productId") || "";
    const locationId = searchParams.get("locationId") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    const conditions = [];
    if (productId && productId !== "all") {
      conditions.push(eq(stockLevels.productId, parseInt(productId)));
    }
    if (locationId && locationId !== "all") {
      conditions.push(eq(stockLevels.locationId, parseInt(locationId)));
    }
    if (dateFrom) {
      const from = new Date(`${dateFrom}T00:00:00.000Z`);
      if (!Number.isNaN(from.getTime())) {
        conditions.push(gte(stockLevels.updatedAt, from));
      }
    }
    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59.999Z`);
      if (!Number.isNaN(to.getTime())) {
        conditions.push(lte(stockLevels.updatedAt, to));
      }
    }
    if (search) {
      conditions.push(
        or(
          ilike(products.code, `%${search}%`),
          ilike(products.name, `%${search}%`),
          ilike(locations.name, `%${search}%`)
        )
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "productCode"
        ? products.code
        : sortBy === "productName"
          ? products.name
          : sortBy === "qty"
            ? stockLevels.qty
            : sortBy === "location"
              ? locations.name
              : stockLevels.updatedAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: stockLevels.id,
          productId: stockLevels.productId,
          productCode: products.code,
          productName: products.name,
          locationId: stockLevels.locationId,
          locationName: locations.name,
          qty: stockLevels.qty,
          updatedAt: stockLevels.updatedAt,
          updatedBy: stockLevels.updatedBy,
          updatedByEmail: users.email,
          updatedByFirstname: users.firstname,
          updatedByLastname: users.lastname,
        })
        .from(stockLevels)
        .innerJoin(products, eq(stockLevels.productId, products.id))
        .innerJoin(locations, eq(stockLevels.locationId, locations.id))
        .leftJoin(users, eq(stockLevels.updatedBy, users.id))
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ value: drizzleCount() })
        .from(stockLevels)
        .innerJoin(products, eq(stockLevels.productId, products.id))
        .innerJoin(locations, eq(stockLevels.locationId, locations.id))
        .where(where),
    ]);

    const total = countResult[0]?.value ?? 0;

    return Response.json({
      data: data.map((row) => ({
        ...row,
        updatedByDisplay: formatUserDisplay(row.updatedByFirstname, row.updatedByLastname),
      })),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("GET /api/stock-levels error:", error);
    return Response.json({ error: "Failed to fetch stock levels" }, { status: 500 });
  }
}
