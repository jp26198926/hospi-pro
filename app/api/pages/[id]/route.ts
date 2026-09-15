import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { pageSchema } from "@/lib/validations/page";
import { eq, ne, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pageId = parseInt(id);

    if (isNaN(pageId)) {
      return Response.json({ error: "Invalid page ID" }, { status: 400 });
    }

    const [data] = await db
      .select()
      .from(pages)
      .where(and(eq(pages.id, pageId), ne(pages.status, "Deleted")));

    if (!data) {
      return Response.json({ error: "Page not found" }, { status: 404 });
    }

    return Response.json({ data });
  } catch (error) {
    console.error("GET /api/pages/[id] error:", error);
    return Response.json({ error: "Failed to fetch page" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pageId = parseInt(id);

    if (isNaN(pageId)) {
      return Response.json({ error: "Invalid page ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = pageSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(pages)
      .where(and(eq(pages.id, pageId), ne(pages.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Page not found" }, { status: 404 });
    }

    const [conflict] = await db
      .select()
      .from(pages)
      .where(
        and(
          eq(pages.page, parsed.data.page),
          eq(pages.path, parsed.data.path),
          ne(pages.id, pageId),
          ne(pages.status, "Deleted")
        )
      );

    if (conflict) {
      return Response.json({ error: "Page name already exists" }, { status: 409 });
    }

    const [data] = await db
      .update(pages)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(pages.id, pageId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PUT /api/pages/[id] error:", error);
    return Response.json({ error: "Failed to update page" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pageId = parseInt(id);

    if (isNaN(pageId)) {
      return Response.json({ error: "Invalid page ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(pages)
      .where(and(eq(pages.id, pageId), ne(pages.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Page not found" }, { status: 404 });
    }

    await db
      .update(pages)
      .set({ status: "Deleted", deletedAt: new Date() })
      .where(eq(pages.id, pageId));

    return Response.json({ message: "Page deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/pages/[id] error:", error);
    return Response.json({ error: "Failed to delete page" }, { status: 500 });
  }
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pageId = parseInt(id);

    if (isNaN(pageId)) {
      return Response.json({ error: "Invalid page ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(pages)
      .where(and(eq(pages.id, pageId), eq(pages.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Deleted page not found" }, { status: 404 });
    }

    const [data] = await db
      .update(pages)
      .set({ status: "Active", deletedAt: null, updatedAt: new Date() })
      .where(eq(pages.id, pageId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PATCH /api/pages/[id] error:", error);
    return Response.json({ error: "Failed to restore page" }, { status: 500 });
  }
}
