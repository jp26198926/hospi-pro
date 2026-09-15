import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { settingsCloudinary } from "@/lib/db/schema";
import { settingsCloudinarySchema } from "@/lib/validations/settings-cloudinary";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/settings-cloudinary", "Read");
    if (auth instanceof Response) return auth;

    const [settings] = await db.select().from(settingsCloudinary).where(eq(settingsCloudinary.id, 1));

    if (!settings) {
      const [defaultSettings] = await db
        .insert(settingsCloudinary)
        .values({})
        .returning();
      return Response.json({ data: defaultSettings });
    }

    return Response.json({ data: settings });
  } catch (error) {
    console.error("GET /api/settings-cloudinary error:", error);
    return Response.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/settings-cloudinary", "Edit");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = settingsCloudinarySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db.select().from(settingsCloudinary).where(eq(settingsCloudinary.id, 1));

    if (!existing) {
      const [data] = await db
        .insert(settingsCloudinary)
        .values({ ...parsed.data, updatedAt: new Date() })
        .returning();
      return Response.json({ data });
    }

    const [data] = await db
      .update(settingsCloudinary)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(settingsCloudinary.id, 1))
      .returning();

    return Response.json({ data });
  } catch (error) {
    console.error("PUT /api/settings-cloudinary error:", error);
    return Response.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
