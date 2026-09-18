import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { paymentMethods } from "@/lib/db/schema";
import { paymentMethodSchema } from "@/lib/validations/payment-method";
import { eq, ne, and } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/payment-methods", "Read");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const paymentMethodId = parseInt(id);

    if (isNaN(paymentMethodId)) {
      return Response.json({ error: "Invalid payment method ID" }, { status: 400 });
    }

    const [data] = await db
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.id, paymentMethodId), ne(paymentMethods.status, "Deleted")));

    if (!data) {
      return Response.json({ error: "Payment method not found" }, { status: 404 });
    }

    return Response.json({ data });
  } catch (error) {
    console.error("GET /api/payment-methods/[id] error:", error);
    return Response.json({ error: "Failed to fetch payment method" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/payment-methods", "Edit");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const paymentMethodId = parseInt(id);

    if (isNaN(paymentMethodId)) {
      return Response.json({ error: "Invalid payment method ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = paymentMethodSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.id, paymentMethodId), ne(paymentMethods.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Payment method not found" }, { status: 404 });
    }

    const [conflictName] = await db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.name, parsed.data.name),
          ne(paymentMethods.id, paymentMethodId),
          ne(paymentMethods.status, "Deleted")
        )
      );

    if (conflictName) {
      return Response.json({ error: "Payment method name already exists" }, { status: 409 });
    }

    const [conflictDescription] = await db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.description, parsed.data.description),
          ne(paymentMethods.id, paymentMethodId),
          ne(paymentMethods.status, "Deleted")
        )
      );

    if (conflictDescription) {
      return Response.json({ error: "Payment method description already exists" }, { status: 409 });
    }

    const [data] = await db
      .update(paymentMethods)
      .set({
        name: parsed.data.name,
        description: parsed.data.description,
        updatedAt: new Date(),
        updatedBy: auth.userId,
      })
      .where(eq(paymentMethods.id, paymentMethodId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PUT /api/payment-methods/[id] error:", error);
    return Response.json({ error: "Failed to update payment method" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/payment-methods", "Delete");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const paymentMethodId = parseInt(id);

    if (isNaN(paymentMethodId)) {
      return Response.json({ error: "Invalid payment method ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.id, paymentMethodId), ne(paymentMethods.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Payment method not found" }, { status: 404 });
    }

    let deletedReason: string | null = null;
    try {
      const body = await request.json();
      if (body?.reason) deletedReason = String(body.reason);
    } catch {
      // No body provided — that's fine
    }

    await db
      .update(paymentMethods)
      .set({
        status: "Deleted",
        deletedAt: new Date(),
        deletedBy: auth.userId,
        deletedReason,
      })
      .where(eq(paymentMethods.id, paymentMethodId));

    return Response.json({ message: "Payment method deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/payment-methods/[id] error:", error);
    return Response.json({ error: "Failed to delete payment method" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/payment-methods", "Restore");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const paymentMethodId = parseInt(id);

    if (isNaN(paymentMethodId)) {
      return Response.json({ error: "Invalid payment method ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.id, paymentMethodId), eq(paymentMethods.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Deleted payment method not found" }, { status: 404 });
    }

    const [data] = await db
      .update(paymentMethods)
      .set({
        status: "Active",
        deletedAt: null,
        deletedBy: null,
        deletedReason: null,
        updatedAt: new Date(),
        updatedBy: auth.userId,
      })
      .where(eq(paymentMethods.id, paymentMethodId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PATCH /api/payment-methods/[id] error:", error);
    return Response.json({ error: "Failed to restore payment method" }, { status: 500 });
  }
}
