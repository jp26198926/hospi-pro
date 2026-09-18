import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { stockLevels, products, locations, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";
import { formatUserDisplay } from "@/lib/format-user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/stock-levels", "Read");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const stockLevelId = parseInt(id);

    if (isNaN(stockLevelId)) {
      return Response.json({ error: "Invalid stock level ID" }, { status: 400 });
    }

    const [data] = await db
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
      .where(eq(stockLevels.id, stockLevelId));

    if (!data) {
      return Response.json({ error: "Stock level not found" }, { status: 404 });
    }

    return Response.json({
      data: {
        ...data,
        updatedByDisplay: formatUserDisplay(
          data.updatedByFirstname,
          data.updatedByLastname
        ),
      },
    });
  } catch (error) {
    console.error("GET /api/stock-levels/[id] error:", error);
    return Response.json({ error: "Failed to fetch stock level" }, { status: 500 });
  }
}
