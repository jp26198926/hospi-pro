import { NextRequest } from "next/server";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { transfers, locations, users } from "@/lib/db/schema";
import { transferSchema } from "@/lib/validations/transfer";
import { formatTransferNo } from "@/lib/validations/transfer-item";
import { formatUserDisplay } from "@/lib/format-user";
import { eq, desc, asc, ilike, and, or, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

const locFrom = alias(locations, "loc_from");
const locTo = alias(locations, "loc_to");

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/transfers", "Read");
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
      conditions.push(eq(transfers.status, status));
    }
    if (fromLocationId && fromLocationId !== "all") {
      conditions.push(eq(transfers.fromLocationId, parseInt(fromLocationId)));
    }
    if (toLocationId && toLocationId !== "all") {
      conditions.push(eq(transfers.toLocationId, parseInt(toLocationId)));
    }
    if (search) {
      conditions.push(
        or(
          ilike(locFrom.name, `%${search}%`),
          ilike(locTo.name, `%${search}%`),
          ilike(transfers.remarks, `%${search}%`)
        )
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "fromLocation"
        ? locFrom.name
        : sortBy === "toLocation"
          ? locTo.name
          : sortBy === "status"
            ? transfers.status
            : sortBy === "createdAt"
              ? transfers.createdAt
              : sortBy === "id"
                ? transfers.id
                : transfers.date;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: transfers.id,
          date: transfers.date,
          fromLocationId: transfers.fromLocationId,
          fromLocationName: locFrom.name,
          toLocationId: transfers.toLocationId,
          toLocationName: locTo.name,
          remarks: transfers.remarks,
          status: transfers.status,
          createdAt: transfers.createdAt,
          createdBy: transfers.createdBy,
          createdByEmail: users.email,
          createdByFirstname: users.firstname,
          createdByLastname: users.lastname,
        })
        .from(transfers)
        .innerJoin(locFrom, eq(transfers.fromLocationId, locFrom.id))
        .innerJoin(locTo, eq(transfers.toLocationId, locTo.id))
        .leftJoin(users, eq(transfers.createdBy, users.id))
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ value: drizzleCount() })
        .from(transfers)
        .innerJoin(locFrom, eq(transfers.fromLocationId, locFrom.id))
        .where(where),
    ]);

    return Response.json({
      data: data.map((row) => ({
        ...row,
        transNo: formatTransferNo(row.id),
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
    console.error("GET /api/transfers error:", error);
    return Response.json({ error: "Failed to fetch transfers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/transfers", "Add");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = transferSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    if (parsed.data.fromLocationId === parsed.data.toLocationId) {
      return Response.json(
        { error: "From and To locations must be different" },
        { status: 400 }
      );
    }

    const [data] = await db
      .insert(transfers)
      .values({
        date: parsed.data.date,
        fromLocationId: parsed.data.fromLocationId,
        toLocationId: parsed.data.toLocationId,
        remarks: parsed.data.remarks || null,
        status: "Draft",
        createdBy: auth.userId,
      })
      .returning();

    return Response.json(
      { data: { ...data, transNo: formatTransferNo(data.id) } },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/transfers error:", error);
    return Response.json({ error: "Failed to create transfer" }, { status: 500 });
  }
}
