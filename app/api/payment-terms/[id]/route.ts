import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { paymentTerms } from "@/lib/db/schema";
import { paymentTermSchema } from "@/lib/validations/payment-term";
import { eq, ne, and } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/payment-terms", "Read");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const paymentTermId = parseInt(id);

    if (isNaN(paymentTermId)) {
      return Response.json({ error: "Invalid payment term ID" }, { status: 400 });
    }

    const [data] = await db
      .select()
      .from(paymentTerms)
      .where(and(eq(paymentTerms.id, paymentTermId), ne(paymentTerms.status, "Deleted")));

    if (!data) {
      return Response.json({ error: "Payment term not found" }, { status: 404 });
    }

    return Response.json({ data });
  } catch (error) {
    console.error("GET /api/payment-terms/[id] error:", error);
    return Response.json({ error: "Failed to fetch payment term" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/payment-terms", "Edit");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const paymentTermId = parseInt(id);

    if (isNaN(paymentTermId)) {
      return Response.json({ error: "Invalid payment term ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = paymentTermSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(paymentTerms)
      .where(and(eq(paymentTerms.id, paymentTermId), ne(paymentTerms.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Payment term not found" }, { status: 404 });
    }

    const [conflictName] = await db
      .select()
      .from(paymentTerms)
      .where(
        and(
          eq(paymentTerms.name, parsed.data.name),
          ne(paymentTerms.id, paymentTermId),
          ne(paymentTerms.status, "Deleted")
        )
      );

    if (conflictName) {
      return Response.json({ error: "Payment term name already exists" }, { status: 409 });
    }

    const [data] = await db
      .update(paymentTerms)
      .set({
        name: parsed.data.name,
        termDays: parsed.data.termDays,
        updatedAt: new Date(),
        updatedBy: auth.userId,
      })
      .where(eq(paymentTerms.id, paymentTermId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PUT /api/payment-terms/[id] error:", error);
    return Response.json({ error: "Failed to update payment term" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/payment-terms", "Delete");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const paymentTermId = parseInt(id);

    if (isNaN(paymentTermId)) {
      return Response.json({ error: "Invalid payment term ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(paymentTerms)
      .where(and(eq(paymentTerms.id, paymentTermId), ne(paymentTerms.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Payment term not found" }, { status: 404 });
    }

    let deletedReason: string | null = null;
    try {
      const body = await request.json();
      if (body?.reason) deletedReason = String(body.reason);
    } catch {
      // No body provided — that's fine
    }

    await db
      .update(paymentTerms)
      .set({
        status: "Deleted",
        deletedAt: new Date(),
        deletedBy: auth.userId,
        deletedReason,
      })
      .where(eq(paymentTerms.id, paymentTermId));

    return Response.json({ message: "Payment term deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/payment-terms/[id] error:", error);
    return Response.json({ error: "Failed to delete payment term" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/payment-terms", "Restore");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const paymentTermId = parseInt(id);

    if (isNaN(paymentTermId)) {
      return Response.json({ error: "Invalid payment term ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(paymentTerms)
      .where(and(eq(paymentTerms.id, paymentTermId), eq(paymentTerms.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Deleted payment term not found" }, { status: 404 });
    }

    const [data] = await db
      .update(paymentTerms)
      .set({
        status: "Active",
        deletedAt: null,
        deletedBy: null,
        deletedReason: null,
        updatedAt: new Date(),
        updatedBy: auth.userId,
      })
      .where(eq(paymentTerms.id, paymentTermId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PATCH /api/payment-terms/[id] error:", error);
    return Response.json({ error: "Failed to restore payment term" }, { status: 500 });
  }
}
