import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { categorySchema } from "@/lib/validations/category";
import { eq, ne, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryId = parseInt(id);

    if (isNaN(categoryId)) {
      return Response.json({ error: "Invalid category ID" }, { status: 400 });
    }

    const [data] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), ne(categories.status, "Deleted")));

    if (!data) {
      return Response.json({ error: "Category not found" }, { status: 404 });
    }

    return Response.json({ data });
  } catch (error) {
    console.error("GET /api/categories/[id] error:", error);
    return Response.json({ error: "Failed to fetch category" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryId = parseInt(id);

    if (isNaN(categoryId)) {
      return Response.json({ error: "Invalid category ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = categorySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), ne(categories.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Category not found" }, { status: 404 });
    }

    const [conflict] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.name, parsed.data.name),
          ne(categories.id, categoryId),
          ne(categories.status, "Deleted")
        )
      );

    if (conflict) {
      return Response.json({ error: "Category name already exists" }, { status: 409 });
    }

    const [data] = await db
      .update(categories)
      .set({
        name: parsed.data.name,
        type: parsed.data.type,
        description: parsed.data.description ?? null,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, categoryId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PUT /api/categories/[id] error:", error);
    return Response.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryId = parseInt(id);

    if (isNaN(categoryId)) {
      return Response.json({ error: "Invalid category ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), ne(categories.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Category not found" }, { status: 404 });
    }

    await db
      .update(categories)
      .set({ status: "Deleted", deletedAt: new Date() })
      .where(eq(categories.id, categoryId));

    return Response.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/categories/[id] error:", error);
    return Response.json({ error: "Failed to delete category" }, { status: 500 });
  }
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryId = parseInt(id);

    if (isNaN(categoryId)) {
      return Response.json({ error: "Invalid category ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Deleted category not found" }, { status: 404 });
    }

    const [data] = await db
      .update(categories)
      .set({ status: "Active", deletedAt: null, updatedAt: new Date() })
      .where(eq(categories.id, categoryId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PATCH /api/categories/[id] error:", error);
    return Response.json({ error: "Failed to restore category" }, { status: 500 });
  }
}
