import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { loginSchema } from "@/lib/validations/auth";
import { generateAccessToken, generateRefreshToken, saveRefreshToken, comparePassword } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, parsed.data.email),
          eq(users.status, "Active")
        )
      );

    if (!user) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValidPassword = await comparePassword(parsed.data.password, user.password);

    if (!isValidPassword) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      roleId: user.roleId,
    });

    const refreshToken = generateRefreshToken();
    await saveRefreshToken(user.id, refreshToken);

    // Set refresh token in httpOnly cookie for web clients
    const response = Response.json({
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          roleId: user.roleId,
        },
      },
    });

    response.headers.set(
      "Set-Cookie",
      `refreshToken=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`
    );

    return response;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return Response.json({ error: "Login failed" }, { status: 500 });
  }
}
