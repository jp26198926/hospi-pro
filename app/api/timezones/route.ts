import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { timezones } from "@/lib/db/schema";
import { ilike, and, asc, count as drizzleCount } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get("limit") || "500")));
    const search = searchParams.get("search") || "";

    const where = search ? ilike(timezones.timezone, `%${search}%`) : undefined;

    const data = await db
      .select()
      .from(timezones)
      .where(where)
      .orderBy(asc(timezones.timezone))
      .limit(limit);

    return Response.json({ data });
  } catch (error) {
    console.error("GET /api/timezones error:", error);
    return Response.json({ error: "Failed to fetch timezones" }, { status: 500 });
  }
}
