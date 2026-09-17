import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { gstTypes } from "@/lib/db/schema";
import { gstTypeSchema } from "@/lib/validations/gst-type";
import { eq, desc, asc, ilike, and, ne, or, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/gst-types", "Read");
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
      conditions.push(eq(gstTypes.status, "Active"));
    } else if (status === "Deleted") {
      conditions.push(eq(gstTypes.status, "Deleted"));
    }
    if (search) {
      conditions.push(or(ilike(gstTypes.code, `%${search}%`), ilike(gstTypes.name, `%${search}%`)));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "code"
        ? gstTypes.code
        : sortBy === "name"
          ? gstTypes.name
          : sortBy === "updatedAt"
            ? gstTypes.updatedAt
            : sortBy === "status"
              ? gstTypes.status
              : gstTypes.createdAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(gstTypes)
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: drizzleCount() }).from(gstTypes).where(where),
    ]);

    const total = countResult[0]?.value ?? 0;

    return Response.json({ data, total, page, limit });
  } catch (error) {
    console.error("GET /api/gst-types error:", error);
    return Response.json({ error: "Failed to fetch GST types" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/gst-types", "Add");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = gstTypeSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existingCode] = await db
      .select()
      .from(gstTypes)
      .where(and(eq(gstTypes.code, parsed.data.code), ne(gstTypes.status, "Deleted")));

    if (existingCode) {
      return Response.json({ error: "GST type code already exists" }, { status: 409 });
    }

    const [existingName] = await db
      .select()
      .from(gstTypes)
      .where(and(eq(gstTypes.name, parsed.data.name), ne(gstTypes.status, "Deleted")));

    if (existingName) {
      return Response.json({ error: "GST type name already exists" }, { status: 409 });
    }

    const [data] = await db
      .insert(gstTypes)
      .values({ ...parsed.data, createdBy: auth.userId })
      .returning();

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/gst-types error:", error);
    return Response.json({ error: "Failed to create GST type" }, { status: 500 });
  }
}
