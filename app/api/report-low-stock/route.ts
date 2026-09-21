import { NextRequest } from "next/server";
import { and, eq, gt, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  stockLevels,
  products,
  locations,
  categories,
  uoms,
} from "@/lib/db/schema";
import { requirePermission } from "@/lib/api-auth";

function fmtQty(n: unknown): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0.0000";
  return num.toFixed(4);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/report-low-stock", "Read");
    if (auth instanceof Response) return auth;

    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "20")));
    const locationId = sp.get("locationId") || "";
    const categoryId = sp.get("categoryId") || "";
    const productId = sp.get("productId") || "";
    const minStockDefined = sp.get("minStockDefined") !== "0";

    const conditions = [
      eq(products.status, "Active"),
      eq(locations.status, "Active"),
      lte(stockLevels.qty, products.minStock),
    ];
    if (minStockDefined) {
      conditions.push(gt(products.minStock, "0"));
    }
    if (locationId && locationId !== "all") {
      conditions.push(eq(stockLevels.locationId, parseInt(locationId)));
    }
    if (productId && productId !== "all") {
      conditions.push(eq(stockLevels.productId, parseInt(productId)));
    }
    if (categoryId && categoryId !== "all") {
      conditions.push(eq(products.categoryId, parseInt(categoryId)));
    }

    const rows = await db
      .select({
        locationId: stockLevels.locationId,
        locationName: locations.name,
        productId: products.id,
        productCode: products.code,
        productName: products.name,
        categoryName: categories.name,
        uomCode: uoms.code,
        minStock: products.minStock,
        qty: stockLevels.qty,
      })
      .from(stockLevels)
      .innerJoin(products, eq(stockLevels.productId, products.id))
      .innerJoin(locations, eq(stockLevels.locationId, locations.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(uoms, eq(products.uomId, uoms.id))
      .where(and(...conditions))
      .orderBy(locations.name, products.code);

    const data = rows.map((r) => {
      const min = Number(r.minStock) || 0;
      const qty = Number(r.qty) || 0;
      return {
        locationId: r.locationId,
        locationName: r.locationName || "",
        productId: r.productId,
        productCode: r.productCode || "",
        productName: r.productName || "",
        categoryName: r.categoryName || "",
        uomCode: r.uomCode || "",
        minStock: fmtQty(min),
        onHand: fmtQty(qty),
        shortage: fmtQty(Math.max(0, min - qty)),
      };
    });

    const total = data.length;
    const start = (page - 1) * limit;
    return Response.json({ data: data.slice(start, start + limit), total, page, limit });
  } catch (error) {
    console.error("Report low stock failed:", error);
    return Response.json({ error: "Failed to load low stock report" }, { status: 500 });
  }
}
