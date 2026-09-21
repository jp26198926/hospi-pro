import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { products, locations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { previewFefo, fmtQty, toNum } from "@/lib/fefo";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/releasings", "Read");
    if (auth instanceof Response) return auth;

    const sp = request.nextUrl.searchParams;
    const productId = parseInt(sp.get("productId") || "0");
    const locationId = parseInt(sp.get("locationId") || "0");
    const qty = Number(sp.get("qty") || "0");
    if (!productId || !locationId || !Number.isFinite(qty) || qty <= 0) {
      return Response.json(
        { error: "productId, locationId, and qty > 0 are required" },
        { status: 400 }
      );
    }

    const [product] = await db
      .select({ id: products.id, code: products.code, name: products.name })
      .from(products)
      .where(eq(products.id, productId));
    const [location] = await db
      .select({ id: locations.id, name: locations.name })
      .from(locations)
      .where(eq(locations.id, locationId));

    const takes = await previewFefo(db, { productId, locationId, qty });
    const allocated = takes.reduce((s, t) => s + t.qty, 0);

    return Response.json({
      product,
      location,
      requestedQty: fmtQty(qty),
      allocatedQty: fmtQty(allocated),
      shortage: fmtQty(Math.max(0, qty - allocated)),
      allocations: takes.map((t) => ({
        batchId: t.batchId,
        batchNo: t.batchNo,
        dateExpiry: t.dateExpiry,
        qty: fmtQty(t.qty),
      })),
    });
  } catch (error) {
    console.error("preview-fefo error:", error);
    return Response.json({ error: "Failed to preview FEFO allocation" }, { status: 500 });
  }
}

void toNum;
