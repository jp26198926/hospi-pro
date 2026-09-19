import { NextRequest } from "next/server";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { releasings, locations, users } from "@/lib/db/schema";
import { releasingSchema } from "@/lib/validations/releasing";
import { formatReleasingNo } from "@/lib/validations/releasing-item";
import { formatUserDisplay } from "@/lib/format-user";
import { eq, desc, asc, ilike, and, or, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

const locFrom = alias(locations, "loc_from");
const locTo = alias(locations, "loc_to");

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/releasings", "Read");
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const status = searchParams.get("status") || "Draft";
    const fromLocationId = searchParams.get("fromLocationId") || "";
    const toLocationId = searchParams.get("toLocationId") || "";

    const conditions = [];
    if (status === "Draft" || status === "Completed" || status === "Cancelled") {
      conditions.push(eq(releasings.status, status));
    }
    if (fromLocationId && fromLocationId !== "all") {
      conditions.push(eq(releasings.fromLocationId, parseInt(fromLocationId)));
    }
    if (toLocationId && toLocationId !== "all") {
      conditions.push(eq(releasings.toLocationId, parseInt(toLocationId)));
    }
    if (search) {
      conditions.push(
        or(
          ilike(locFrom.name, `%${search}%`),
          ilike(locTo.name, `%${search}%`),
          ilike(releasings.receiverName, `%${search}%`),
          ilike(releasings.remarks, `%${search}%`)
        )
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "fromLocation"
        ? locFrom.name
        : sortBy === "toLocation"
          ? locTo.name
          : sortBy === "receiverName"
            ? releasings.receiverName
            : sortBy === "status"
              ? releasings.status
              : sortBy === "createdAt"
                ? releasings.createdAt
                : sortBy === "id"
                  ? releasings.id
                  : releasings.date;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: releasings.id,
          date: releasings.date,
          fromLocationId: releasings.fromLocationId,
          fromLocationName: locFrom.name,
          toLocationId: releasings.toLocationId,
          toLocationName: locTo.name,
          receiverName: releasings.receiverName,
          remarks: releasings.remarks,
          status: releasings.status,
          createdAt: releasings.createdAt,
          createdBy: releasings.createdBy,
          createdByEmail: users.email,
          createdByFirstname: users.firstname,
          createdByLastname: users.lastname,
        })
        .from(releasings)
        .innerJoin(locFrom, eq(releasings.fromLocationId, locFrom.id))
        .leftJoin(locTo, eq(releasings.toLocationId, locTo.id))
        .leftJoin(users, eq(releasings.createdBy, users.id))
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ value: drizzleCount() })
        .from(releasings)
        .innerJoin(locFrom, eq(releasings.fromLocationId, locFrom.id))
        .where(where),
    ]);

    return Response.json({
      data: data.map((row) => ({
        ...row,
        transNo: formatReleasingNo(row.id),
        createdByDisplay: formatUserDisplay(
          row.createdByFirstname,
          row.createdByLastname
        ),
      })),
      total: countResult[0]?.value ?? 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("GET /api/releasings error:", error);
    return Response.json({ error: "Failed to fetch releasings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/releasings", "Add");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = releasingSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [data] = await db
      .insert(releasings)
      .values({
        date: parsed.data.date,
        fromLocationId: parsed.data.fromLocationId,
        toLocationId: parsed.data.toLocationId || null,
        receiverName: parsed.data.receiverName,
        remarks: parsed.data.remarks || null,
        status: "Draft",
        createdBy: auth.userId,
      })
      .returning();

    return Response.json(
      { data: { ...data, transNo: formatReleasingNo(data.id) } },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/releasings error:", error);
    return Response.json({ error: "Failed to create releasing" }, { status: 500 });
  }
}
