import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { locations } from "@/lib/db/schema";
import { locationSchema } from "@/lib/validations/location";
import { eq, desc, asc, ilike, and, ne, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/locations", "Read");
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const status = searchParams.get("status") || "all";

    const conditions = [];
    if (status === "Active") {
      conditions.push(eq(locations.status, "Active"));
    } else if (status === "Deleted") {
      conditions.push(eq(locations.status, "Deleted"));
    }
    if (search) {
      conditions.push(ilike(locations.name, `%${search}%`));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "name"
        ? locations.name
        : sortBy === "updatedAt"
          ? locations.updatedAt
          : sortBy === "status"
            ? locations.status
            : locations.createdAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(locations)
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: drizzleCount() }).from(locations).where(where),
    ]);

    const total = countResult[0]?.value ?? 0;

    return Response.json({ data, total, page, limit });
  } catch (error) {
    console.error("GET /api/locations error:", error);
    return Response.json({ error: "Failed to fetch locations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/locations", "Add");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = locationSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.name, parsed.data.name), ne(locations.status, "Deleted")));

    if (existing) {
      return Response.json({ error: "Location already exists" }, { status: 409 });
    }

    const [data] = await db.insert(locations).values(parsed.data).returning();

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/locations error:", error);
    return Response.json({ error: "Failed to create location" }, { status: 500 });
  }
}
