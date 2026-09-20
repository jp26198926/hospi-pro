import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { products, uoms, stockLevels } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/conversions", "Read");
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const fromProductId = parseInt(searchParams.get("fromProductId") || "0");
    const toProductId = parseInt(searchParams.get("toProductId") || "0");
    const locationId = parseInt(searchParams.get("locationId") || "0");

    if (!fromProductId || !toProductId || !locationId) {
      return Response.json(
        { error: "fromProductId, toProductId and locationId are required" },
        { status: 400 }
      );
    }

    const [fromProduct] = await db
      .select({ uomName: uoms.name, uomId: products.uomId })
      .from(products)
      .innerJoin(uoms, eq(products.uomId, uoms.id))
      .where(eq(products.id, fromProductId));

    const [toProduct] = await db
      .select({ uomName: uoms.name, uomId: products.uomId })
      .from(products)
      .innerJoin(uoms, eq(products.uomId, uoms.id))
      .where(eq(products.id, toProductId));

    const [level] = await db
      .select()
      .from(stockLevels)
      .where(
        and(
          eq(stockLevels.productId, fromProductId),
          eq(stockLevels.locationId, locationId)
        )
      );

    return Response.json({
      data: {
        fromUomId: fromProduct?.uomId ?? null,
        fromUomName: fromProduct?.uomName ?? null,
        toUomId: toProduct?.uomId ?? null,
        toUomName: toProduct?.uomName ?? null,
        fromStockQty: level ? Number(level.qty) || 0 : 0,
      },
    });
  } catch (error) {
    console.error("GET /api/conversions/preview error:", error);
    return Response.json({ error: "Failed to preview conversion" }, { status: 500 });
  }
}
