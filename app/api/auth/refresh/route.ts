import { NextRequest } from "next/server";
import { validateRefreshToken, generateAccessToken, generateRefreshToken, saveRefreshToken, deleteRefreshToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie or body
    const cookieRefreshToken = request.cookies.get("refreshToken")?.value;
    const body = await request.json().catch(() => ({}));
    const refreshToken = cookieRefreshToken || body.refreshToken;

    if (!refreshToken) {
      return Response.json({ error: "Refresh token required" }, { status: 401 });
    }

    const userId = await validateRefreshToken(refreshToken);

    if (!userId) {
      return Response.json({ error: "Invalid or expired refresh token" }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user || user.status !== "Active") {
      return Response.json({ error: "User not found or inactive" }, { status: 401 });
    }

    // Delete old refresh token
    await deleteRefreshToken(refreshToken);

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      roleId: user.roleId,
    });

    const newRefreshToken = generateRefreshToken();
    await saveRefreshToken(user.id, newRefreshToken);

    const response = Response.json({
      data: { accessToken: newAccessToken },
    });

    response.headers.set(
      "Set-Cookie",
      `refreshToken=${newRefreshToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`
    );

    return response;
  } catch (error) {
    console.error("POST /api/auth/refresh error:", error);
    return Response.json({ error: "Token refresh failed" }, { status: 500 });
  }
}
