import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { locations } from "@/lib/db/schema";
import { locationSchema } from "@/lib/validations/location";
import { eq, ne, and } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/locations", "Read");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const locationId = parseInt(id);

    if (isNaN(locationId)) {
      return Response.json({ error: "Invalid location ID" }, { status: 400 });
    }

    const [data] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, locationId), ne(locations.status, "Deleted")));

    if (!data) {
      return Response.json({ error: "Location not found" }, { status: 404 });
    }

    return Response.json({ data });
  } catch (error) {
    console.error("GET /api/locations/[id] error:", error);
    return Response.json({ error: "Failed to fetch location" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/locations", "Edit");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const locationId = parseInt(id);

    if (isNaN(locationId)) {
      return Response.json({ error: "Invalid location ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = locationSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, locationId), ne(locations.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Location not found" }, { status: 404 });
    }

    const [conflict] = await db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.name, parsed.data.name),
          ne(locations.id, locationId),
          ne(locations.status, "Deleted")
        )
      );

    if (conflict) {
      return Response.json({ error: "Location name already exists" }, { status: 409 });
    }

    const [data] = await db
      .update(locations)
      .set({ name: parsed.data.name, updatedAt: new Date() })
      .where(eq(locations.id, locationId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PUT /api/locations/[id] error:", error);
    return Response.json({ error: "Failed to update location" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/locations", "Delete");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const locationId = parseInt(id);

    if (isNaN(locationId)) {
      return Response.json({ error: "Invalid location ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, locationId), ne(locations.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Location not found" }, { status: 404 });
    }

    await db
      .update(locations)
      .set({ status: "Deleted", deletedAt: new Date() })
      .where(eq(locations.id, locationId));

    return Response.json({ message: "Location deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/locations/[id] error:", error);
    return Response.json({ error: "Failed to delete location" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/locations", "Restore");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const locationId = parseInt(id);

    if (isNaN(locationId)) {
      return Response.json({ error: "Invalid location ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, locationId), eq(locations.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "Deleted location not found" }, { status: 404 });
    }

    const [data] = await db
      .update(locations)
      .set({ status: "Active", deletedAt: null, updatedAt: new Date() })
      .where(eq(locations.id, locationId))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PATCH /api/locations/[id] error:", error);
    return Response.json({ error: "Failed to restore location" }, { status: 500 });
  }
}
