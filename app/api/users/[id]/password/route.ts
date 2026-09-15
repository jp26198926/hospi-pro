import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { changePasswordSchema } from "@/lib/validations/user";
import { eq, ne, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return Response.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), ne(users.status, "Deleted")));

    if (!existing) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 10);

    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return Response.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("PUT /api/users/[id]/password error:", error);
    return Response.json({ error: "Failed to update password" }, { status: 500 });
  }
}
