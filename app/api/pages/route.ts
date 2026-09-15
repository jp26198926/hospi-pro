import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { pageSchema } from "@/lib/validations/page";
import { eq, desc, asc, ilike, and, ne, count as drizzleCount, sql, aliasedTable } from "drizzle-orm";

const parentPages = aliasedTable(pages, "parent_pages");

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const search = searchParams.get("search") || "";
    const searchPath = searchParams.get("searchPath") || "";
    const searchParent = searchParams.get("searchParent") || "";
    const sortBy = searchParams.get("sortBy") || "order";
    const sortOrder = searchParams.get("sortOrder") || "asc";
    const status = searchParams.get("status") || "all";

    const conditions = [];
    if (status === "Active") {
      conditions.push(eq(pages.status, "Active"));
    } else if (status === "Deleted") {
      conditions.push(eq(pages.status, "Deleted"));
    }
    if (search) {
      conditions.push(ilike(pages.page, `%${search}%`));
    }
    if (searchPath) {
      conditions.push(ilike(pages.path, `%${searchPath}%`));
    }
    if (searchParent === "none") {
      conditions.push(sql`${pages.parentId} IS NULL`);
    } else if (searchParent) {
      conditions.push(eq(pages.parentId, parseInt(searchParent)));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "page"
        ? pages.page
        : sortBy === "path"
          ? pages.path
          : sortBy === "order"
            ? pages.order
            : sortBy === "updatedAt"
              ? pages.updatedAt
              : sortBy === "status"
                ? pages.status
                : pages.createdAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: pages.id,
          page: pages.page,
          path: pages.path,
          icon: pages.icon,
          parentId: pages.parentId,
          parentName: parentPages.page,
          order: pages.order,
          status: pages.status,
          createdAt: pages.createdAt,
          updatedAt: pages.updatedAt,
          deletedAt: pages.deletedAt,
        })
        .from(pages)
        .leftJoin(parentPages, eq(pages.parentId, parentPages.id))
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: drizzleCount() }).from(pages).where(where),
    ]);

    const total = countResult[0]?.value ?? 0;

    return Response.json({ data, total, page, limit });
  } catch (error) {
    console.error("GET /api/pages error:", error);
    return Response.json({ error: "Failed to fetch pages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = pageSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(pages)
      .where(
        and(
          eq(pages.page, parsed.data.page),
          eq(pages.path, parsed.data.path),
          ne(pages.status, "Deleted")
        )
      );

    if (existing) {
      return Response.json({ error: "Page already exists" }, { status: 409 });
    }

    const [data] = await db.insert(pages).values(parsed.data).returning();

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/pages error:", error);
    return Response.json({ error: "Failed to create page" }, { status: 500 });
  }
}
