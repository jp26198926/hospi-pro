import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { transTypes } from "@/lib/db/schema";
import { transTypeSchema } from "@/lib/validations/trans-type";
import { eq, desc, asc, ilike, and, ne, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/trans-types", "Read");
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
      conditions.push(eq(transTypes.status, "Active"));
    } else if (status === "Deleted") {
      conditions.push(eq(transTypes.status, "Deleted"));
    }
    if (search) {
      conditions.push(ilike(transTypes.name, `%${search}%`));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "name"
        ? transTypes.name
        : sortBy === "updatedAt"
          ? transTypes.updatedAt
          : sortBy === "status"
            ? transTypes.status
            : transTypes.createdAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(transTypes)
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: drizzleCount() }).from(transTypes).where(where),
    ]);

    const total = countResult[0]?.value ?? 0;

    return Response.json({ data, total, page, limit });
  } catch (error) {
    console.error("GET /api/trans-types error:", error);
    return Response.json({ error: "Failed to fetch trans types" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/trans-types", "Add");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = transTypeSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existingName] = await db
      .select()
      .from(transTypes)
      .where(and(eq(transTypes.name, parsed.data.name), ne(transTypes.status, "Deleted")));

    if (existingName) {
      return Response.json({ error: "Trans type name already exists" }, { status: 409 });
    }

    const [data] = await db
      .insert(transTypes)
      .values({
        name: parsed.data.name,
        createdBy: auth.userId,
      })
      .returning();

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/trans-types error:", error);
    return Response.json({ error: "Failed to create trans type" }, { status: 500 });
  }
}
