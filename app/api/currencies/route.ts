import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currencies } from "@/lib/db/schema";
import { ilike, or, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get("limit") || "500")));
    const search = searchParams.get("search") || "";

    const where = search
      ? or(ilike(currencies.code, `%${search}%`), ilike(currencies.name, `%${search}%`))
      : undefined;

    const data = await db
      .select()
      .from(currencies)
      .where(where)
      .orderBy(asc(currencies.code))
      .limit(limit);

    return Response.json({ data });
  } catch (error) {
    console.error("GET /api/currencies error:", error);
    return Response.json({ error: "Failed to fetch currencies" }, { status: 500 });
  }
}
