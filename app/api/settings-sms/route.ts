import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { settingsSms } from "@/lib/db/schema";
import { settingsSmsSchema } from "@/lib/validations/settings-sms";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const [settings] = await db.select().from(settingsSms).where(eq(settingsSms.id, 1));

    if (!settings) {
      const [defaultSettings] = await db
        .insert(settingsSms)
        .values({})
        .returning();
      return Response.json({ data: defaultSettings });
    }

    return Response.json({ data: settings });
  } catch (error) {
    console.error("GET /api/settings-sms error:", error);
    return Response.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = settingsSmsSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db.select().from(settingsSms).where(eq(settingsSms.id, 1));

    if (!existing) {
      const [data] = await db
        .insert(settingsSms)
        .values({ ...parsed.data, updatedAt: new Date() })
        .returning();
      return Response.json({ data });
    }

    const [data] = await db
      .update(settingsSms)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(settingsSms.id, 1))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PUT /api/settings-sms error:", error);
    return Response.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
