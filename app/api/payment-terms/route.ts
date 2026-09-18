import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { paymentTerms } from "@/lib/db/schema";
import { paymentTermSchema } from "@/lib/validations/payment-term";
import { eq, desc, asc, ilike, and, ne, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/payment-terms", "Read");
    if (auth instanceof Response) return auth;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const status = searchParams.get("status") || "all";

    const conditions = [];
    if (status === "Active") {
      conditions.push(eq(paymentTerms.status, "Active"));
    } else if (status === "Deleted") {
      conditions.push(eq(paymentTerms.status, "Deleted"));
    }
    if (search) {
      conditions.push(ilike(paymentTerms.name, `%${search}%`));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "name"
        ? paymentTerms.name
        : sortBy === "termDays"
          ? paymentTerms.termDays
          : sortBy === "updatedAt"
            ? paymentTerms.updatedAt
            : sortBy === "status"
              ? paymentTerms.status
              : paymentTerms.createdAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(paymentTerms)
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: drizzleCount() }).from(paymentTerms).where(where),
    ]);

    const total = countResult[0]?.value ?? 0;

    return Response.json({ data, total, page, limit });
  } catch (error) {
    console.error("GET /api/payment-terms error:", error);
    return Response.json({ error: "Failed to fetch payment terms" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/payment-terms", "Add");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = paymentTermSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existingName] = await db
      .select()
      .from(paymentTerms)
      .where(and(eq(paymentTerms.name, parsed.data.name), ne(paymentTerms.status, "Deleted")));

    if (existingName) {
      return Response.json({ error: "Payment term name already exists" }, { status: 409 });
    }

    const [data] = await db
      .insert(paymentTerms)
      .values({
        name: parsed.data.name,
        termDays: Number.isFinite(parsed.data.termDays) ? parsed.data.termDays : 0,
        createdBy: auth.userId,
      })
      .returning();

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/payment-terms error:", error);
    return Response.json({ error: "Failed to create payment term" }, { status: 500 });
  }
}
