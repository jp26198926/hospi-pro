import { NextRequest } from "next/server";
import { deleteRefreshToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refreshToken")?.value;

    if (refreshToken) {
      await deleteRefreshToken(refreshToken);
    }

    const response = Response.json({ message: "Logged out successfully" });

    // Clear the refresh token cookie
    response.headers.set(
      "Set-Cookie",
      "refreshToken=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
    );

    return response;
  } catch (error) {
    console.error("POST /api/auth/logout error:", error);
    return Response.json({ error: "Logout failed" }, { status: 500 });
  }
}
