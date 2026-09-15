import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { settingsMail } from "@/lib/db/schema";
import { settingsMailSchema } from "@/lib/validations/settings-mail";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/settings-mail", "Read");
    if (auth instanceof Response) return auth;

    const [settings] = await db.select().from(settingsMail).where(eq(settingsMail.id, 1));

    if (!settings) {
      const [defaultSettings] = await db
        .insert(settingsMail)
        .values({})
        .returning();
      return Response.json({ data: defaultSettings });
    }

    return Response.json({ data: settings });
  } catch (error) {
    console.error("GET /api/settings-mail error:", error);
    return Response.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/settings-mail", "Edit");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = settingsMailSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db.select().from(settingsMail).where(eq(settingsMail.id, 1));

    if (!existing) {
      const [data] = await db
        .insert(settingsMail)
        .values({ ...parsed.data, updatedAt: new Date() })
        .returning();
      return Response.json({ data });
    }

    const [data] = await db
      .update(settingsMail)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(settingsMail.id, 1))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PUT /api/settings-mail error:", error);
    return Response.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
