import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { stockLevels, products, uoms, locations } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

const PHARMACY_LOCATION_NAME = "pharmacy";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/phar-adjustments", "Read");
    if (auth instanceof Response) return auth;

    const [phar] = await db
      .select({ id: locations.id, name: locations.name })
      .from(locations)
      .where(
        and(
          eq(locations.status, "Active"),
          sql`lower(${locations.name}) = ${PHARMACY_LOCATION_NAME}`
        )
      );

    if (!phar) {
      return Response.json({ error: "Pharmacy location not found" }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const productId = parseInt(searchParams.get("productId") || "0");

    if (!productId) {
      return Response.json({ error: "productId is required" }, { status: 400 });
    }

    const [level] = await db
      .select()
      .from(stockLevels)
      .where(
        and(eq(stockLevels.productId, productId), eq(stockLevels.locationId, phar.id))
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
        locationId: phar.id,
        locationName: phar.name,
      },
    });
  } catch (error) {
    console.error("GET /api/phar-adjustments/preview error:", error);
    return Response.json({ error: "Failed to preview pharmacy stock" }, { status: 500 });
  }
}
