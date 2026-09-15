import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { registerSchema } from "@/lib/validations/auth";
import { generateAccessToken, generateRefreshToken, saveRefreshToken, hashPassword } from "@/lib/auth";
import { eq, and, ne } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, parsed.data.email), ne(users.status, "Deleted")));

    if (existing) {
      return Response.json({ error: "Email already exists" }, { status: 409 });
    }

    const hashedPassword = await hashPassword(parsed.data.password);

    const [user] = await db
      .insert(users)
      .values({
        ...parsed.data,
        password: hashedPassword,
        departmentId: parsed.data.departmentId || null,
        roleId: parsed.data.roleId || null,
      })
      .returning();

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      roleId: user.roleId,
    });

    const refreshToken = generateRefreshToken();
    await saveRefreshToken(user.id, refreshToken);

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
    }, { status: 201 });

    response.headers.set(
      "Set-Cookie",
      `refreshToken=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`
    );

    return response;
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    return Response.json({ error: "Registration failed" }, { status: 500 });
  }
}
