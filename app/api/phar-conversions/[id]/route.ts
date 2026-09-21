import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { conversions, locations } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { cancelConversion } from "@/lib/conversion-stock";
import { requirePermission } from "@/lib/api-auth";

const PHARMACY_LOCATION_NAME = "pharmacy";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/phar-conversions", "Delete");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const conversionId = parseInt(id);
    if (isNaN(conversionId)) {
      return Response.json({ error: "Invalid conversion ID" }, { status: 400 });
    }

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

    const [doc] = await db
      .select({ id: conversions.id, locationId: conversions.locationId })
      .from(conversions)
      .where(eq(conversions.id, conversionId));
    if (!doc) {
      return Response.json({ error: "Conversion not found" }, { status: 404 });
    }
    if (doc.locationId !== phar.id) {
      return Response.json(
        { error: "Conversion is not at the pharmacy location" },
        { status: 403 }
      );
    }

    let deletedReason: string | null = null;
    try {
      const body = await request.json();
      if (body?.reason) deletedReason = String(body.reason);
    } catch {
      // no body
    }

    await cancelConversion(conversionId, auth.userId, deletedReason);
    return Response.json({ message: "Conversion cancelled and stock reversed" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel pharmacy conversion";
    console.error("DELETE /api/phar-conversions/[id] error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
