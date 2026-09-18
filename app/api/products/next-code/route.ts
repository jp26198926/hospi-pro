import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/products", "Read");
    if (auth instanceof Response) return auth;

    const [maxRow] = await db
      .select({ maxId: sql`COALESCE(MAX(id), 0)` })
      .from(products);
    const code = `P${String(Number(maxRow.maxId) + 1).padStart(6, "0")}`;

    return Response.json({ data: { code } });
  } catch (error) {
    console.error("GET /api/products/next-code error:", error);
    return Response.json({ error: "Failed to generate next product code" }, { status: 500 });
  }
}
