import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { stockMovements, transTypes, products, locations, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";
import { formatUserDisplay } from "@/lib/format-user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/stock-movements", "Read");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const stockMovementId = parseInt(id);

    if (isNaN(stockMovementId)) {
      return Response.json({ error: "Invalid stock movement ID" }, { status: 400 });
    }

    const [data] = await db
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
      .where(eq(stockMovements.id, stockMovementId));

    if (!data) {
      return Response.json({ error: "Stock movement not found" }, { status: 404 });
    }

    return Response.json({
      data: {
        ...data,
        createdByDisplay: formatUserDisplay(
          data.createdByFirstname,
          data.createdByLastname
        ),
      },
    });
  } catch (error) {
    console.error("GET /api/stock-movements/[id] error:", error);
    return Response.json({ error: "Failed to fetch stock movement" }, { status: 500 });
  }
}
