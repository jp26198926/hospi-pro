import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { products, categories, gstTypes, uoms } from "@/lib/db/schema";
import { productSchema } from "@/lib/validations/product";
import { eq, ne, and } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/products", "Read");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const productId = parseInt(id);

    if (isNaN(productId)) {
      return Response.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const [data] = await db
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
      .where(and(eq(products.id, productId), ne(products.status, "Deleted")));

    if (!data) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    return Response.json({ data });
  } catch (error) {
    console.error("GET /api/products/[id] error:", error);
    return Response.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/products", "Edit");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const productId = parseInt(id);

    if (isNaN(productId)) {
      return Response.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = productSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), ne(products.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    const [conflictCode] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.code, parsed.data.code),
          ne(products.id, productId),
          ne(products.status, "Deleted")
        )
      );

    if (conflictCode) {
      return Response.json({ error: "Product code already exists" }, { status: 409 });
    }

    const [conflict] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.name, parsed.data.name),
          ne(products.id, productId),
          ne(products.status, "Deleted")
        )
      );

    if (conflict) {
      return Response.json({ error: "Product name already exists" }, { status: 409 });
    }

    const [data] = await db
      .update(products)
      .set({
        code: parsed.data.code,
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
        updatedAt: new Date(),
        updatedBy: auth.userId,
      })
      .where(eq(products.id, productId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PUT /api/products/[id] error:", error);
    return Response.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/products", "Delete");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const productId = parseInt(id);

    if (isNaN(productId)) {
      return Response.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), ne(products.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    let deletedReason: string | null = null;
    try {
      const body = await request.json();
      if (body?.reason) deletedReason = String(body.reason);
    } catch {
      // No body — fine
    }

    await db
      .update(products)
      .set({
        status: "Deleted",
        deletedAt: new Date(),
        deletedBy: auth.userId,
        deletedReason,
      })
      .where(eq(products.id, productId));

    return Response.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error);
    return Response.json({ error: "Failed to delete product" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/products", "Restore");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const productId = parseInt(id);

    if (isNaN(productId)) {
      return Response.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Deleted product not found" }, { status: 404 });
    }

    const [data] = await db
      .update(products)
      .set({
        status: "Active",
        deletedAt: null,
        deletedBy: null,
        deletedReason: null,
        updatedAt: new Date(),
        updatedBy: auth.userId,
      })
      .where(eq(products.id, productId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PATCH /api/products/[id] error:", error);
    return Response.json({ error: "Failed to restore product" }, { status: 500 });
  }
}
