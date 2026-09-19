import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { releasingItems, releasings, products, uoms } from "@/lib/db/schema";
import { releasingItemSchema, formatReleasingItemNo } from "@/lib/validations/releasing-item";
import { getDraftItemsQty, getStockAtLocation } from "@/lib/releasing-stock";
import { eq, desc, asc, ilike, and, ne, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/releasings", "Read");
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const releasingId = parseInt(searchParams.get("releasingId") || "0");
    if (!releasingId) {
      return Response.json({ error: "releasingId is required" }, { status: 400 });
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "100")));
    const search = searchParams.get("search") || "";
    const showCancelled = searchParams.get("showCancelled") === "true";
    const sortBy = searchParams.get("sortBy") || "id";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    const conditions = [eq(releasingItems.releasingId, releasingId)];
    if (!showCancelled) {
      conditions.push(ne(releasingItems.status, "Cancelled"));
    }
    if (search) {
      conditions.push(ilike(products.code, `%${search}%`));
    }
    const where = and(...conditions);

    const sortColumn =
      sortBy === "productCode"
        ? products.code
        : sortBy === "productName"
          ? products.name
          : sortBy === "qty"
            ? releasingItems.qty
            : sortBy === "status"
              ? releasingItems.status
              : releasingItems.id;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: releasingItems.id,
          releasingId: releasingItems.releasingId,
          productId: releasingItems.productId,
          productCode: products.code,
          productName: products.name,
          uomName: uoms.name,
          qty: releasingItems.qty,
          dateExpiry: releasingItems.dateExpiry,
          remarks: releasingItems.remarks,
          status: releasingItems.status,
        })
        .from(releasingItems)
        .innerJoin(products, eq(releasingItems.productId, products.id))
        .innerJoin(uoms, eq(products.uomId, uoms.id))
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ value: drizzleCount() })
        .from(releasingItems)
        .innerJoin(products, eq(releasingItems.productId, products.id))
        .where(where),
    ]);

    return Response.json({
      data: data.map((row) => ({
        ...row,
        seriesNo: formatReleasingItemNo(row.id),
      })),
      total: countResult[0]?.value ?? 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("GET /api/releasing-items error:", error);
    return Response.json({ error: "Failed to fetch releasing items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/releasings", "Edit");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const releasingId = parseInt(body.releasingId || "0");
    if (!releasingId) {
      return Response.json({ error: "releasingId is required" }, { status: 400 });
    }

    const parsed = releasingItemSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [parent] = await db
      .select()
      .from(releasings)
      .where(eq(releasings.id, releasingId));
    if (!parent) {
      return Response.json({ error: "Releasing not found" }, { status: 404 });
    }
    if (parent.status !== "Draft") {
      return Response.json(
        { error: "Items can only be added to draft releasings" },
        { status: 400 }
      );
    }

    const available = await getStockAtLocation(
      parsed.data.productId,
      parent.fromLocationId
    );
    const draftQty = await getDraftItemsQty(releasingId, parsed.data.productId);
    if (parsed.data.qty + draftQty > available) {
      return Response.json(
        {
          error: `Insufficient stock at location. Available: ${available.toFixed(4)}`,
        },
        { status: 400 }
      );
    }

    const [data] = await db
      .insert(releasingItems)
      .values({
        releasingId,
        productId: parsed.data.productId,
        qty: parsed.data.qty.toFixed(4),
        dateExpiry: parsed.data.dateExpiry || null,
        remarks: parsed.data.remarks || null,
        status: "Draft",
        createdBy: auth.userId,
      })
      .returning();

    return Response.json(
      { data: { ...data, seriesNo: formatReleasingItemNo(data.id) } },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/releasing-items error:", error);
    return Response.json({ error: "Failed to create releasing item" }, { status: 500 });
  }
}
