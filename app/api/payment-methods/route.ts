import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { paymentMethods } from "@/lib/db/schema";
import { paymentMethodSchema } from "@/lib/validations/payment-method";
import { eq, desc, asc, ilike, and, ne, or, count as drizzleCount } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/payment-methods", "Read");
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
      conditions.push(eq(paymentMethods.status, "Active"));
    } else if (status === "Deleted") {
      conditions.push(eq(paymentMethods.status, "Deleted"));
    }
    if (search) {
      conditions.push(
        or(
          ilike(paymentMethods.name, `%${search}%`),
          ilike(paymentMethods.description, `%${search}%`)
        )
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sortBy === "name"
        ? paymentMethods.name
        : sortBy === "description"
          ? paymentMethods.description
          : sortBy === "updatedAt"
            ? paymentMethods.updatedAt
            : sortBy === "status"
              ? paymentMethods.status
              : paymentMethods.createdAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(paymentMethods)
        .where(where)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: drizzleCount() }).from(paymentMethods).where(where),
    ]);

    const total = countResult[0]?.value ?? 0;

    return Response.json({ data, total, page, limit });
  } catch (error) {
    console.error("GET /api/payment-methods error:", error);
    return Response.json({ error: "Failed to fetch payment methods" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/payment-methods", "Add");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = paymentMethodSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existingName] = await db
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.name, parsed.data.name), ne(paymentMethods.status, "Deleted")));

    if (existingName) {
      return Response.json({ error: "Payment method name already exists" }, { status: 409 });
    }

    const [existingDescription] = await db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.description, parsed.data.description),
          ne(paymentMethods.status, "Deleted")
        )
      );

    if (existingDescription) {
      return Response.json({ error: "Payment method description already exists" }, { status: 409 });
    }

    const [data] = await db
      .insert(paymentMethods)
      .values({
        name: parsed.data.name,
        description: parsed.data.description,
        createdBy: auth.userId,
      })
      .returning();

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/payment-methods error:", error);
    return Response.json({ error: "Failed to create payment method" }, { status: 500 });
  }
}
