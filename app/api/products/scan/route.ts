import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { products, uoms, stockLevels } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/releasings", "Read");
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const code = (searchParams.get("code") || "").trim();
    const locationId = parseInt(searchParams.get("locationId") || "0");

    if (!code) {
      return Response.json({ error: "Product code is required" }, { status: 400 });
    }

    const [product] = await db
      .select({
        id: products.id,
        code: products.code,
        name: products.name,
        uomId: products.uomId,
        uomName: uoms.name,
        status: products.status,
      })
      .from(products)
      .innerJoin(uoms, eq(products.uomId, uoms.id))
      .where(eq(products.code, code));

    if (!product) {
      return Response.json(
        { error: `Product not found for barcode: ${code}` },
        { status: 404 }
      );
    }
    if (product.status === "Deleted") {
      return Response.json(
        { error: `Product ${product.code} is not active` },
        { status: 400 }
      );
    }

    let stockQty = "0.0000";
    if (!Number.isNaN(locationId) && locationId > 0) {
      const [level] = await db
        .select()
        .from(stockLevels)
        .where(
          and(
            eq(stockLevels.productId, product.id),
            eq(stockLevels.locationId, locationId)
          )
        );
      if (level) stockQty = level.qty;
    }

    return Response.json({
      data: {
        id: product.id,
        code: product.code,
        name: product.name,
        uomId: product.uomId,
        uomName: product.uomName,
        stockQty,
        dateExpiry: null,
      },
    });
  } catch (error) {
    console.error("GET /api/products/scan error:", error);
    return Response.json({ error: "Failed to scan product" }, { status: 500 });
  }
}
