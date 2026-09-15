import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { settingsApp } from "@/lib/db/schema";
import { settingsAppSchema } from "@/lib/validations/settings-application";
import { eq } from "drizzle-orm";
import { requireAuth, requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const [settings] = await db.select().from(settingsApp).where(eq(settingsApp.id, 1));

    if (!settings) {
      // Create default settings row
      const [defaultSettings] = await db
        .insert(settingsApp)
        .values({ appName: "RBAC System" })
        .returning();
      return Response.json({ data: defaultSettings });
    }

    return Response.json({ data: settings });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return Response.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/settings-application", "Edit");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = settingsAppSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db.select().from(settingsApp).where(eq(settingsApp.id, 1));

    if (!existing) {
      // Create if not exists
      const [data] = await db
        .insert(settingsApp)
        .values({ ...parsed.data, updatedAt: new Date() })
        .returning();
      return Response.json({ data });
    }

    // Update existing
    const [data] = await db
      .update(settingsApp)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(settingsApp.id, 1))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return Response.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
