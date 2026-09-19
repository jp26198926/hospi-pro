import { NextRequest } from "next/server";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { releasings, releasingItems, locations, users } from "@/lib/db/schema";
import { releasingSchema } from "@/lib/validations/releasing";
import { formatReleasingNo } from "@/lib/validations/releasing-item";
import { formatUserDisplay } from "@/lib/format-user";
import { eq, and, inArray } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";
import { cancelCompletedReleasing } from "@/lib/releasing-stock";

const locFrom = alias(locations, "loc_from");
const locTo = alias(locations, "loc_to");

async function loadReleasing(id: number) {
  const [row] = await db
    .select({
      id: releasings.id,
      date: releasings.date,
      fromLocationId: releasings.fromLocationId,
      fromLocationName: locFrom.name,
      toLocationId: releasings.toLocationId,
      toLocationName: locTo.name,
      receiverName: releasings.receiverName,
      remarks: releasings.remarks,
      status: releasings.status,
      createdAt: releasings.createdAt,
      updatedAt: releasings.updatedAt,
      deletedAt: releasings.deletedAt,
      deletedReason: releasings.deletedReason,
      createdBy: releasings.createdBy,
      updatedBy: releasings.updatedBy,
      deletedBy: releasings.deletedBy,
    })
    .from(releasings)
    .innerJoin(locFrom, eq(releasings.fromLocationId, locFrom.id))
    .leftJoin(locTo, eq(releasings.toLocationId, locTo.id))
    .where(eq(releasings.id, id));

  if (!row) return null;

  const userIds = [row.createdBy, row.updatedBy, row.deletedBy].filter(
    (v): v is number => typeof v === "number"
  );
  const userRows = userIds.length
    ? await db
        .select({
          id: users.id,
          firstname: users.firstname,
          lastname: users.lastname,
        })
        .from(users)
        .where(inArray(users.id, userIds))
    : [];
  const userMap = new Map(
    userRows.map((u) => [u.id, formatUserDisplay(u.firstname, u.lastname)])
  );

  return {
    ...row,
    createdByEmail: null,
    createdByDisplay: row.createdBy ? userMap.get(row.createdBy) || "-" : "-",
    updatedByDisplay: row.updatedBy ? userMap.get(row.updatedBy) || "-" : "-",
    deletedByDisplay: row.deletedBy ? userMap.get(row.deletedBy) || "-" : "-",
    transNo: formatReleasingNo(row.id),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/releasings", "Read");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const releasingId = parseInt(id);
    if (isNaN(releasingId)) {
      return Response.json({ error: "Invalid releasing ID" }, { status: 400 });
    }

    const data = await loadReleasing(releasingId);
    if (!data) {
      return Response.json({ error: "Releasing not found" }, { status: 404 });
    }
    return Response.json({ data });
  } catch (error) {
    console.error("GET /api/releasings/[id] error:", error);
    return Response.json({ error: "Failed to fetch releasing" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/releasings", "Edit");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const releasingId = parseInt(id);
    if (isNaN(releasingId)) {
      return Response.json({ error: "Invalid releasing ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(releasings)
      .where(eq(releasings.id, releasingId));
    if (!existing) {
      return Response.json({ error: "Releasing not found" }, { status: 404 });
    }
    if (existing.status !== "Draft") {
      return Response.json({ error: "Only draft releasings can be edited" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = releasingSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [data] = await db
      .update(releasings)
      .set({
        date: parsed.data.date,
        fromLocationId: parsed.data.fromLocationId,
        toLocationId: parsed.data.toLocationId || null,
        receiverName: parsed.data.receiverName,
        remarks: parsed.data.remarks || null,
        updatedAt: new Date(),
        updatedBy: auth.userId,
      })
      .where(eq(releasings.id, releasingId))
      .returning();

    return Response.json({
      data: { ...data, transNo: formatReleasingNo(data.id) },
    });
  } catch (error) {
    console.error("PUT /api/releasings/[id] error:", error);
    return Response.json({ error: "Failed to update releasing" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/releasings", "Delete");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const releasingId = parseInt(id);
    if (isNaN(releasingId)) {
      return Response.json({ error: "Invalid releasing ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(releasings)
      .where(eq(releasings.id, releasingId));
    if (!existing) {
      return Response.json({ error: "Releasing not found" }, { status: 404 });
    }
    if (existing.status === "Cancelled") {
      return Response.json({ error: "Releasing is already cancelled" }, { status: 400 });
    }

    let deletedReason: string | null = null;
    try {
      const body = await request.json();
      if (body?.reason) deletedReason = String(body.reason);
    } catch {
      // no body
    }

    if (existing.status === "Completed") {
      await cancelCompletedReleasing(releasingId, auth.userId, deletedReason);
      return Response.json({ message: "Releasing cancelled and stock reversed" });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(releasings)
        .set({
          status: "Cancelled",
          deletedAt: new Date(),
          deletedBy: auth.userId,
          deletedReason,
        })
        .where(eq(releasings.id, releasingId));
      await tx
        .update(releasingItems)
        .set({
          status: "Cancelled",
          deletedAt: new Date(),
          deletedBy: auth.userId,
          deletedReason,
        })
        .where(
          and(
            eq(releasingItems.releasingId, releasingId),
            eq(releasingItems.status, "Draft")
          )
        );
    });

    return Response.json({ message: "Releasing cancelled successfully" });
  } catch (error) {
    console.error("DELETE /api/releasings/[id] error:", error);
    return Response.json({ error: "Failed to cancel releasing" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/releasings", "Restore");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const releasingId = parseInt(id);
    if (isNaN(releasingId)) {
      return Response.json({ error: "Invalid releasing ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(releasings)
      .where(eq(releasings.id, releasingId));
    if (!existing) {
      return Response.json({ error: "Releasing not found" }, { status: 404 });
    }
    if (existing.status !== "Cancelled") {
      return Response.json(
        { error: "Only cancelled releasings can be restored" },
        { status: 400 }
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(releasings)
        .set({
          status: "Draft",
          deletedAt: null,
          deletedBy: null,
          deletedReason: null,
          updatedAt: new Date(),
          updatedBy: auth.userId,
        })
        .where(eq(releasings.id, releasingId));
      await tx
        .update(releasingItems)
        .set({
          status: "Draft",
          deletedAt: null,
          deletedBy: null,
          deletedReason: null,
          updatedAt: new Date(),
          updatedBy: auth.userId,
        })
        .where(eq(releasingItems.releasingId, releasingId));
    });

    return Response.json({ message: "Releasing restored to draft" });
  } catch (error) {
    console.error("PATCH /api/releasings/[id] error:", error);
    return Response.json({ error: "Failed to restore releasing" }, { status: 500 });
  }
}
