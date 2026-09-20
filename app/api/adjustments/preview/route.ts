import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { stockLevels, products, uoms } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/adjustments", "Read");
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const productId = parseInt(searchParams.get("productId") || "0");
    const locationId = parseInt(searchParams.get("locationId") || "0");

    if (!productId || !locationId) {
      return Response.json(
        { error: "productId and locationId are required" },
        { status: 400 }
      );
    }

    const [level] = await db
      .select()
      .from(stockLevels)
      .where(
        and(eq(stockLevels.productId, productId), eq(stockLevels.locationId, locationId))
      );

    const [product] = await db
      .select({
        uomId: products.uomId,
        uomName: uoms.name,
      })
      .from(products)
      .innerJoin(uoms, eq(products.uomId, uoms.id))
      .where(eq(products.id, productId));

    return Response.json({
      data: {
        qtyOld: level ? Number(level.qty) || 0 : 0,
        uomId: product?.uomId ?? null,
        uomName: product?.uomName ?? null,
      },
    });
  } catch (error) {
    console.error("GET /api/adjustments/preview error:", error);
    return Response.json({ error: "Failed to preview stock" }, { status: 500 });
  }
}
