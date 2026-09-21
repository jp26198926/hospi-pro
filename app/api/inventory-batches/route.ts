import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { inventoryBatches, products, locations } from "@/lib/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/releasings", "Read");
    if (auth instanceof Response) return auth;

    const sp = request.nextUrl.searchParams;
    const productId = sp.get("productId") || "";
    const locationId = sp.get("locationId") || "";
    if (!productId || !locationId || productId === "all" || locationId === "all") {
      return Response.json({ data: [] });
    }

    const rows = await db
      .select({
        id: inventoryBatches.id,
        batchNo: inventoryBatches.batchNo,
        dateExpiry: inventoryBatches.dateExpiry,
        qty: inventoryBatches.qty,
        productCode: products.code,
        productName: products.name,
        locationName: locations.name,
      })
      .from(inventoryBatches)
      .innerJoin(products, eq(inventoryBatches.productId, products.id))
      .innerJoin(locations, eq(inventoryBatches.locationId, locations.id))
      .where(
        and(
          eq(inventoryBatches.productId, parseInt(productId)),
          eq(inventoryBatches.locationId, parseInt(locationId)),
          eq(inventoryBatches.status, "Active"),
          sql`${inventoryBatches.qty} > 0`
        )
      )
      .orderBy(sql`${inventoryBatches.dateExpiry} ASC NULLS LAST`, asc(inventoryBatches.id));

    return Response.json({ data: rows });
  } catch (error) {
    console.error("inventory-batches error:", error);
    return Response.json({ error: "Failed to load batches" }, { status: 500 });
  }
}
