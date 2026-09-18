import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { receivingItems, receivings, products } from "@/lib/db/schema";
import { receivingItemSchema } from "@/lib/validations/receiving-item";
import { formatBatchNo } from "@/lib/validations/receiving-item";
import { eq, desc, asc, ilike, and, ne, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/receivings", "Read");
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const receivingId = parseInt(searchParams.get("receivingId") || "0");
    if (!receivingId) {
      return Response.json({ error: "receivingId is required" }, { status: 400 });
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "100")));
    const search = searchParams.get("search") || "";
    const showCancelled = searchParams.get("showCancelled") === "true";
    const sortBy = searchParams.get("sortBy") || "id";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    const conditions = [eq(receivingItems.receivingId, receivingId)];
    if (!showCancelled) {
      conditions.push(ne(receivingItems.status, "Cancelled"));
    }
    if (search) {
      conditions.push(
        ilike(products.code, `%${search}%`)
      );
    }
    const where = and(...conditions);

    const sortColumn =
      sortBy === "productCode"
        ? products.code
        : sortBy === "productName"
          ? products.name
          : sortBy === "qty"
            ? receivingItems.qty
            : sortBy === "status"
              ? receivingItems.status
              : sortBy === "unitCost"
                ? receivingItems.unitCost
                : sortBy === "totalCost"
                  ? receivingItems.totalCost
                  : sortBy === "dateExpiry"
                    ? receivingItems.dateExpiry
                    : receivingItems.id;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: receivingItems.id,
          receivingId: receivingItems.receivingId,
          productId: receivingItems.productId,
          productCode: products.code,
          productName: products.name,
          qty: receivingItems.qty,
          unitCost: receivingItems.unitCost,
          totalCost: receivingItems.totalCost,
          dateExpiry: receivingItems.dateExpiry,
          remarks: receivingItems.remarks,
          status: receivingItems.status,
          createdAt: receivingItems.createdAt,
          updatedAt: receivingItems.updatedAt,
          deletedAt: receivingItems.deletedAt,
        })
        .from(receivingItems)
        .innerJoin(products, eq(receivingItems.productId, products.id))
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ value: drizzleCount() })
        .from(receivingItems)
        .innerJoin(products, eq(receivingItems.productId, products.id))
        .where(where),
    ]);

    const total = countResult[0]?.value ?? 0;

    return Response.json({
      data: data.map((row) => ({ ...row, batchNo: formatBatchNo(row.id) })),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("GET /api/receiving-items error:", error);
    return Response.json({ error: "Failed to fetch receiving items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/receivings", "Edit");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const receivingId = parseInt(body.receivingId || "0");
    if (!receivingId) {
      return Response.json({ error: "receivingId is required" }, { status: 400 });
    }

    const parsed = receivingItemSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [parent] = await db
      .select()
      .from(receivings)
      .where(eq(receivings.id, receivingId));

    if (!parent) {
      return Response.json({ error: "Receiving not found" }, { status: 404 });
    }
    if (parent.status !== "Draft") {
      return Response.json(
        { error: "Items can only be added to draft receivings" },
        { status: 400 }
      );
    }

    const totalCost = parsed.data.qty * parsed.data.unitCost;

    const [data] = await db
      .insert(receivingItems)
      .values({
        receivingId,
        productId: parsed.data.productId,
        qty: parsed.data.qty.toFixed(4),
        unitCost: parsed.data.unitCost.toFixed(4),
        totalCost: totalCost.toFixed(4),
        dateExpiry: parsed.data.dateExpiry || null,
        remarks: parsed.data.remarks || null,
        status: "Draft",
        createdBy: auth.userId,
      })
      .returning();

    return Response.json(
      { data: { ...data, batchNo: formatBatchNo(data.id) } },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/receiving-items error:", error);
    return Response.json({ error: "Failed to create receiving item" }, { status: 500 });
  }
}
