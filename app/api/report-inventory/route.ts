import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";

function fmtQty(n: unknown): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0.0000";
  return num.toFixed(4);
}

type AggRow = {
  locationId: number | string;
  locationName: string;
  productId: number | string;
  productCode: string;
  productName: string;
  categoryName: string | null;
  uomCode: string | null;
  inQty: string | number;
  outQty: string | number;
};

type BegRow = {
  locationId: number | string;
  productId: number | string;
  begBal: string | number;
};

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const withRows = result as { rows?: T[] };
  if (Array.isArray(withRows.rows)) return withRows.rows;
  return [];
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/report-inventory", "Read");
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const locationId = searchParams.get("locationId") || "";
    const categoryId = searchParams.get("categoryId") || "";
    const productId = searchParams.get("productId") || "";

    const from = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : null;
    if (from && Number.isNaN(from.getTime())) {
      return Response.json({ error: "Invalid dateFrom" }, { status: 400 });
    }
    if (to && Number.isNaN(to.getTime())) {
      return Response.json({ error: "Invalid dateTo" }, { status: 400 });
    }
    // postgres.js prepared queries reject Date instances — bind ISO strings
    const fromIso = from ? from.toISOString() : null;
    const toIso = to ? to.toISOString() : null;

    const locId = locationId && locationId !== "all" ? parseInt(locationId) : null;
    const prodId = productId && productId !== "all" ? parseInt(productId) : null;
    const catId = categoryId && categoryId !== "all" ? parseInt(categoryId) : null;

    const dimMatch = (row: { locationId: number | string; productId: number | string }) =>
      (locId === null || Number(row.locationId) === locId) &&
      (prodId === null || Number(row.productId) === prodId);

    // Dimension-only SQL fragments via drizzle tagged templates
    const dimWhere = sql`
      p.status <> 'Deleted'
      AND l.status <> 'Deleted'
      ${locId !== null ? sql`AND sm.location_id = ${locId}` : sql``}
      ${prodId !== null ? sql`AND sm.product_id = ${prodId}` : sql``}
      ${catId !== null ? sql`AND p.category_id = ${catId}` : sql``}
    `;

    const rangeWhere = sql`
      ${dimWhere}
      ${fromIso ? sql`AND sm.date >= ${fromIso}` : sql``}
      ${toIso ? sql`AND sm.date <= ${toIso}` : sql``}
    `;

    const inOutResult = await db.execute(sql`
      SELECT
        sm.location_id AS "locationId",
        l.name AS "locationName",
        sm.product_id AS "productId",
        p.code AS "productCode",
        p.name AS "productName",
        COALESCE(c.name, '') AS "categoryName",
        COALESCE(u.code, '') AS "uomCode",
        COALESCE(SUM(CASE WHEN sm.qty > 0 THEN sm.qty ELSE 0 END), 0) AS "inQty",
        COALESCE(SUM(CASE WHEN sm.qty < 0 THEN ABS(sm.qty) ELSE 0 END), 0) AS "outQty"
      FROM stock_movements sm
      INNER JOIN products p ON p.id = sm.product_id
      INNER JOIN locations l ON l.id = sm.location_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN uoms u ON u.id = p.uom_id
      WHERE ${rangeWhere}
      GROUP BY sm.location_id, l.name, sm.product_id, p.code, p.name, c.name, u.code
    `);

    const inOutRows = extractRows<AggRow>(inOutResult);

    const begMap = new Map<string, number>();
    if (fromIso) {
      const begResult = await db.execute(sql`
        SELECT
          sm.location_id AS "locationId",
          sm.product_id AS "productId",
          COALESCE(SUM(sm.qty), 0) AS "begBal"
        FROM stock_movements sm
        INNER JOIN products p ON p.id = sm.product_id
        INNER JOIN locations l ON l.id = sm.location_id
        WHERE ${dimWhere} AND sm.date < ${fromIso}
        GROUP BY sm.location_id, sm.product_id
      `);
      for (const r of extractRows<BegRow>(begResult)) {
        begMap.set(`${r.locationId}:${r.productId}`, Number(r.begBal) || 0);
      }
    }

    const data = inOutRows
      .filter((r) => dimMatch(r))
      .map((r) => {
        const key = `${r.locationId}:${r.productId}`;
        const begBal = fromIso ? begMap.get(key) ?? 0 : 0;
        const inQty = Number(r.inQty) || 0;
        const outQty = Number(r.outQty) || 0;
        return {
          locationId: Number(r.locationId),
          locationName: r.locationName || "",
          productId: Number(r.productId),
          productCode: r.productCode || "",
          productName: r.productName || "",
          categoryName: r.categoryName || "",
          uomCode: r.uomCode || "",
          begBal: fmtQty(begBal),
          inQty: fmtQty(inQty),
          outQty: fmtQty(outQty),
          endBal: fmtQty(begBal + inQty - outQty),
        };
      });

    data.sort(
      (a, b) =>
        a.locationName.localeCompare(b.locationName) ||
        a.productCode.localeCompare(b.productCode)
    );

    const total = data.length;
    const start = (page - 1) * limit;
    const paged = data.slice(start, start + limit);

    return Response.json({ data: paged, total, page, limit });
  } catch (error) {
    console.error("Report inventory failed:", error);
    return Response.json({ error: "Failed to generate inventory report" }, { status: 500 });
  }
}
