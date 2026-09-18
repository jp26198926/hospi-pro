import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { products, categories, gstTypes, uoms } from "@/lib/db/schema";
import { productSchema } from "@/lib/validations/product";
import { eq, desc, asc, ilike, and, ne, or, sql, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/products", "Read");
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const status = searchParams.get("status") || "all";
    const categoryId = searchParams.get("categoryId") || "";
    const gstTypeId = searchParams.get("gstTypeId") || "";
    const uomId = searchParams.get("uomId") || "";

    const conditions = [];
    if (status === "Active") {
      conditions.push(eq(products.status, "Active"));
    } else if (status === "Deleted") {
      conditions.push(eq(products.status, "Deleted"));
    }
    if (categoryId && categoryId !== "all") {
      conditions.push(eq(products.categoryId, parseInt(categoryId)));
    }
    if (gstTypeId && gstTypeId !== "all") {
      conditions.push(eq(products.gstTypeId, parseInt(gstTypeId)));
    }
    if (uomId && uomId !== "all") {
      conditions.push(eq(products.uomId, parseInt(uomId)));
    }
    if (search) {
      conditions.push(
        or(
          ilike(products.code, `%${search}%`),
          ilike(products.name, `%${search}%`),
          ilike(products.brand, `%${search}%`),
          ilike(products.model, `%${search}%`)
        )
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "code"
        ? products.code
        : sortBy === "name"
          ? products.name
          : sortBy === "brand"
            ? products.brand
            : sortBy === "stock"
              ? products.stock
              : sortBy === "updatedAt"
                ? products.updatedAt
                : sortBy === "status"
                  ? products.status
                  : products.createdAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: products.id,
          code: products.code,
          name: products.name,
          categoryId: products.categoryId,
          categoryName: categories.name,
          brand: products.brand,
          model: products.model,
          minStock: products.minStock,
          stock: products.stock,
          lastCost: products.lastCost,
          avgCost: products.avgCost,
          sellingPrice: products.sellingPrice,
          gstTypeId: products.gstTypeId,
          gstTypeName: gstTypes.name,
          uomId: products.uomId,
          uomName: uoms.name,
          status: products.status,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
          deletedAt: products.deletedAt,
          createdBy: products.createdBy,
          updatedBy: products.updatedBy,
          deletedBy: products.deletedBy,
          deletedReason: products.deletedReason,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(gstTypes, eq(products.gstTypeId, gstTypes.id))
        .leftJoin(uoms, eq(products.uomId, uoms.id))
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: drizzleCount() }).from(products).where(where),
    ]);

    const total = countResult[0]?.value ?? 0;

    return Response.json({ data, total, page, limit });
  } catch (error) {
    console.error("GET /api/products error:", error);
    return Response.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/products", "Add");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = productSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existingCode] = await db
      .select()
      .from(products)
      .where(and(eq(products.code, parsed.data.code), ne(products.status, "Deleted")));

    if (existingCode) {
      return Response.json({ error: "Product code already exists" }, { status: 409 });
    }

    const [existing] = await db
      .select()
      .from(products)
      .where(and(eq(products.name, parsed.data.name), ne(products.status, "Deleted")));

    if (existing) {
      return Response.json({ error: "Product name already exists" }, { status: 409 });
    }

    // Fallback auto-gen if code is somehow empty: P + max(id)+1 padded to 6 digits
    let code = parsed.data.code;
    if (!code) {
      const [maxRow] = await db
        .select({ maxId: sql`COALESCE(MAX(id), 0)` })
        .from(products);
      code = `P${String(Number(maxRow.maxId) + 1).padStart(6, "0")}`;
    }

    const [data] = await db
      .insert(products)
      .values({
        code,
        name: parsed.data.name,
        categoryId: parsed.data.categoryId || null,
        brand: parsed.data.brand || null,
        model: parsed.data.model || null,
        minStock: parsed.data.minStock?.toString() || "0",
        stock: parsed.data.stock?.toString() || "0",
        lastCost: parsed.data.lastCost?.toString() || "0",
        avgCost: parsed.data.avgCost?.toString() || "0",
        sellingPrice: parsed.data.sellingPrice?.toString() || "0",
        gstTypeId: parsed.data.gstTypeId,
        uomId: parsed.data.uomId,
        createdBy: auth.userId,
      })
      .returning();

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/products error:", error);
    return Response.json({ error: "Failed to create product" }, { status: 500 });
  }
}
