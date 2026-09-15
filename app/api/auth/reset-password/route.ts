import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { hashPassword, deleteUserRefreshTokens } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, parsed.data.email), eq(users.status, "Active")));

    if (!user) {
      return Response.json({ error: "Invalid email or OTP" }, { status: 400 });
    }

    // TODO: Verify OTP against stored value
    // For now, accept any 6-digit OTP as valid (implement OTP storage first)
    // if (user.otp !== parsed.data.otp) {
    //   return Response.json({ error: "Invalid OTP" }, { status: 400 });
    // }

    const hashedPassword = await hashPassword(parsed.data.newPassword);

    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
        /* otp: null */
      })
      .where(eq(users.id, user.id));

    // Invalidate all refresh tokens for this user
    await deleteUserRefreshTokens(user.id);

    return Response.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("POST /api/auth/reset-password error:", error);
    return Response.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
