import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { transferItems, transfers, products, uoms } from "@/lib/db/schema";
import { transferItemSchema, formatTransferItemNo } from "@/lib/validations/transfer-item";
import { getDraftItemsQty, getStockAtLocation } from "@/lib/transfer-stock";
import { eq, desc, asc, ilike, and, ne, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/transfers", "Read");
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const transferId = parseInt(searchParams.get("transferId") || "0");
    if (!transferId) {
      return Response.json({ error: "transferId is required" }, { status: 400 });
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "100")));
    const showCancelled = searchParams.get("showCancelled") === "true";
    const sortBy = searchParams.get("sortBy") || "id";
    const sortOrder = searchParams.get("sortOrder") || "asc";
    const search = searchParams.get("search") || "";

    const conditions = [eq(transferItems.transferId, transferId)];
    if (!showCancelled) {
      conditions.push(ne(transferItems.status, "Cancelled"));
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
            ? transferItems.qty
            : sortBy === "status"
              ? transferItems.status
              : transferItems.id;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: transferItems.id,
          transferId: transferItems.transferId,
          productId: transferItems.productId,
          productCode: products.code,
          productName: products.name,
          uomName: uoms.name,
          qty: transferItems.qty,
          dateExpiry: transferItems.dateExpiry,
          remarks: transferItems.remarks,
          status: transferItems.status,
        })
        .from(transferItems)
        .innerJoin(products, eq(transferItems.productId, products.id))
        .innerJoin(uoms, eq(products.uomId, uoms.id))
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ value: drizzleCount() })
        .from(transferItems)
        .innerJoin(products, eq(transferItems.productId, products.id))
        .where(where),
    ]);

    return Response.json({
      data: data.map((row) => ({
        ...row,
        seriesNo: formatTransferItemNo(row.id),
      })),
      total: countResult[0]?.value ?? 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("GET /api/transfer-items error:", error);
    return Response.json({ error: "Failed to fetch transfer items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/transfers", "Edit");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const transferId = parseInt(body.transferId || "0");
    if (!transferId) {
      return Response.json({ error: "transferId is required" }, { status: 400 });
    }

    const parsed = transferItemSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [parent] = await db.select().from(transfers).where(eq(transfers.id, transferId));
    if (!parent) {
      return Response.json({ error: "Transfer not found" }, { status: 404 });
    }
    if (parent.status !== "Draft") {
      return Response.json(
        { error: "Items can only be added to draft transfers" },
        { status: 400 }
      );
    }

    const available = await getStockAtLocation(parsed.data.productId, parent.fromLocationId);
    const draftQty = await getDraftItemsQty(transferId, parsed.data.productId);
    if (parsed.data.qty + draftQty > available) {
      return Response.json(
        { error: `Insufficient stock at from-location. Available: ${available.toFixed(4)}` },
        { status: 400 }
      );
    }

    const [data] = await db
      .insert(transferItems)
      .values({
        transferId,
        productId: parsed.data.productId,
        qty: parsed.data.qty.toFixed(4),
        dateExpiry: parsed.data.dateExpiry || null,
        remarks: parsed.data.remarks || null,
        status: "Draft",
        createdBy: auth.userId,
      })
      .returning();

    return Response.json(
      { data: { ...data, seriesNo: formatTransferItemNo(data.id) } },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/transfer-items error:", error);
    return Response.json({ error: "Failed to create transfer item" }, { status: 500 });
  }
}
