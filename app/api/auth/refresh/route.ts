import { NextRequest } from "next/server";
import {
  validateRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  deleteRefreshToken,
  getBypassCreds,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function setRefreshCookie(response: Response, refreshToken: string) {
  response.headers.set(
    "Set-Cookie",
    `refreshToken=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`
  );
}

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie or body
    const cookieRefreshToken = request.cookies.get("refreshToken")?.value;
    const body = await request.json().catch(() => ({}));
    const refreshToken = cookieRefreshToken || body.refreshToken;

    if (!refreshToken) {
      return Response.json({ error: "Refresh token required" }, { status: 401 });
    }

    const result = await validateRefreshToken(refreshToken);

    if (!result) {
      return Response.json({ error: "Invalid or expired refresh token" }, { status: 401 });
    }

    let newAccessToken: string;
    let newRefreshToken: string;

    if (result.bypass) {
      // Bypass session: no DB row to rotate or persist
      const creds = getBypassCreds();
      newAccessToken = generateAccessToken({
        userId: 0,
        email: creds?.email ?? "",
        firstname: "Bypass",
        lastname: "Admin",
        roleId: null,
        bypass: true,
      });
      newRefreshToken = generateRefreshToken(true);
    } else {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, result.userId));

      if (!user || user.status !== "Active") {
        return Response.json({ error: "User not found or inactive" }, { status: 401 });
      }

      // Delete old refresh token
      await deleteRefreshToken(refreshToken);

      newAccessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        roleId: user.roleId,
      });

      newRefreshToken = generateRefreshToken();
      await saveRefreshToken(user.id, newRefreshToken);
    }

    const response = Response.json({
      data: { accessToken: newAccessToken },
    });

    setRefreshCookie(response, newRefreshToken);

    return response;
  } catch (error) {
    console.error("POST /api/auth/refresh error:", error);
    return Response.json({ error: "Token refresh failed" }, { status: 500 });
  }
}
