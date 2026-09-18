import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { receivings, suppliers, users } from "@/lib/db/schema";
import { receivingSchema } from "@/lib/validations/receiving";
import { formatReceivingNo } from "@/lib/validations/receiving-item";
import { eq, desc, asc, ilike, and, or, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/receivings", "Read");
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const status = searchParams.get("status") || "all";
    const supplierId = searchParams.get("supplierId") || "";

    const conditions = [];
    if (status === "Draft" || status === "Completed" || status === "Cancelled") {
      conditions.push(eq(receivings.status, status));
    }
    if (supplierId && supplierId !== "all") {
      conditions.push(eq(receivings.supplierId, parseInt(supplierId)));
    }
    if (search) {
      conditions.push(
        or(
          ilike(suppliers.name, `%${search}%`),
          ilike(receivings.poNumber, `%${search}%`),
          ilike(receivings.invoiceNumber, `%${search}%`),
          ilike(receivings.remarks, `%${search}%`)
        )
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "supplier"
        ? suppliers.name
        : sortBy === "status"
          ? receivings.status
          : sortBy === "createdAt"
            ? receivings.createdAt
            : sortBy === "id"
              ? receivings.id
              : sortBy === "poNumber"
                ? receivings.poNumber
                : sortBy === "invoiceNumber"
                  ? receivings.invoiceNumber
                  : receivings.date;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: receivings.id,
          date: receivings.date,
          supplierId: receivings.supplierId,
          supplierName: suppliers.name,
          locationId: receivings.locationId,
          poNumber: receivings.poNumber,
          invoiceNumber: receivings.invoiceNumber,
          remarks: receivings.remarks,
          status: receivings.status,
          createdAt: receivings.createdAt,
          updatedAt: receivings.updatedAt,
          cancelledAt: receivings.cancelledAt,
          createdBy: receivings.createdBy,
          createdByEmail: users.email,
        })
        .from(receivings)
        .innerJoin(suppliers, eq(receivings.supplierId, suppliers.id))
        .leftJoin(users, eq(receivings.createdBy, users.id))
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ value: drizzleCount() })
        .from(receivings)
        .innerJoin(suppliers, eq(receivings.supplierId, suppliers.id))
        .where(where),
    ]);

    const total = countResult[0]?.value ?? 0;

    return Response.json({
      data: data.map((row) => ({
        ...row,
        transNo: formatReceivingNo(row.id),
      })),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("GET /api/receivings error:", error);
    return Response.json({ error: "Failed to fetch receivings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/receivings", "Add");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = receivingSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [data] = await db
      .insert(receivings)
      .values({
        date: parsed.data.date,
        supplierId: parsed.data.supplierId,
        locationId: parsed.data.locationId,
        poNumber: parsed.data.poNumber || null,
        invoiceNumber: parsed.data.invoiceNumber || null,
        remarks: parsed.data.remarks || null,
        status: "Draft",
        createdBy: auth.userId,
      })
      .returning();

    return Response.json(
      { data: { ...data, transNo: formatReceivingNo(data.id) } },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/receivings error:", error);
    return Response.json({ error: "Failed to create receiving" }, { status: 500 });
  }
}
