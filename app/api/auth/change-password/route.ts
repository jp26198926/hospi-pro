import { NextRequest } from "next/server";
import { verifyAccessToken, comparePassword, hashPassword, deleteUserRefreshTokens } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { changePasswordSchema } from "@/lib/validations/auth";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return Response.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId));

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const isValid = await comparePassword(parsed.data.currentPassword, user.password);
    if (!isValid) {
      return Response.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const newHash = await hashPassword(parsed.data.newPassword);
    await db
      .update(users)
      .set({ password: newHash, updatedAt: new Date() })
      .where(eq(users.id, payload.userId));

    // Invalidate all refresh tokens so the user must re-login on other sessions
    await deleteUserRefreshTokens(payload.userId);

    return Response.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("POST /api/auth/change-password error:", error);
    return Response.json({ error: "Failed to change password" }, { status: 500 });
  }
}
