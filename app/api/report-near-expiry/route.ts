import { NextRequest } from "next/server";
import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inventoryBatches,
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

function fmtDate(d: Date | null): string {
  if (!d || Number.isNaN(d.getTime())) return "-";
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/report-near-expiry", "Read");
    if (auth instanceof Response) return auth;

    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "20")));
    const days = Math.min(365, Math.max(1, parseInt(sp.get("days") || "30")));
    const locationId = sp.get("locationId") || "";
    const categoryId = sp.get("categoryId") || "";
    const productId = sp.get("productId") || "";
    const statusFilter = sp.get("status") || "all";

    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const cutoff = new Date(todayStart.getTime() + days * 24 * 60 * 60 * 1000);
    const cutoffIso = cutoff.toISOString();
    const todayIso = todayStart.toISOString();

    const conditions = [
      eq(inventoryBatches.status, "Active"),
      sql`${inventoryBatches.qty} > 0`,
      sql`${inventoryBatches.dateExpiry} IS NOT NULL`,
      lte(inventoryBatches.dateExpiry, cutoff),
      eq(products.status, "Active"),
    ];
    if (locationId && locationId !== "all") {
      conditions.push(eq(inventoryBatches.locationId, parseInt(locationId)));
    }
    if (productId && productId !== "all") {
      conditions.push(eq(inventoryBatches.productId, parseInt(productId)));
    }
    if (categoryId && categoryId !== "all") {
      conditions.push(eq(products.categoryId, parseInt(categoryId)));
    }

    const rows = await db
      .select({
        id: inventoryBatches.id,
        locationId: inventoryBatches.locationId,
        locationName: locations.name,
        productId: products.id,
        productCode: products.code,
        productName: products.name,
        categoryName: categories.name,
        uomCode: uoms.code,
        batchNo: inventoryBatches.batchNo,
        dateExpiry: inventoryBatches.dateExpiry,
        qty: inventoryBatches.qty,
      })
      .from(inventoryBatches)
      .innerJoin(products, eq(inventoryBatches.productId, products.id))
      .innerJoin(locations, eq(inventoryBatches.locationId, locations.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(uoms, eq(products.uomId, uoms.id))
      .where(and(...conditions));

    let data = rows.map((r) => {
      const exp = r.dateExpiry ? new Date(r.dateExpiry) : null;
      const daysLeft = exp
        ? Math.floor((exp.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000))
        : null;
      const expired = exp ? exp.getTime() < todayStart.getTime() : false;
      return {
        id: r.id,
        locationId: r.locationId,
        locationName: r.locationName || "",
        productId: r.productId,
        productCode: r.productCode || "",
        productName: r.productName || "",
        categoryName: r.categoryName || "",
        uomCode: r.uomCode || "",
        batchNo: r.batchNo,
        expiry: fmtDate(r.dateExpiry ? new Date(r.dateExpiry) : null),
        daysLeft: daysLeft ?? 0,
        qty: fmtQty(r.qty),
        status: expired ? ("Expired" as const) : ("Near Expiry" as const),
      };
    });

    if (statusFilter === "near") {
      data = data.filter((d) => d.status === "Near Expiry");
    } else if (statusFilter === "expired") {
      data = data.filter((d) => d.status === "Expired");
    }

    data.sort((a, b) => a.daysLeft - b.daysLeft || a.productCode.localeCompare(b.productCode));

    const total = data.length;
    const start = (page - 1) * limit;
    void todayIso;
    void cutoffIso;
    return Response.json({ data: data.slice(start, start + limit), total, page, limit });
  } catch (error) {
    console.error("Report near expiry failed:", error);
    return Response.json({ error: "Failed to load near expiry report" }, { status: 500 });
  }
}
