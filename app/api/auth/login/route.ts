import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { loginSchema } from "@/lib/validations/auth";
import {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  comparePassword,
  getBypassCreds,
  safeEqual,
} from "@/lib/auth";
import { eq, and } from "drizzle-orm";

const INVALID_CREDENTIALS = { error: "Invalid email or password" };

function setRefreshCookie(response: Response, refreshToken: string) {
  response.headers.set(
    "Set-Cookie",
    `refreshToken=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // 1. Database first
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, parsed.data.email),
          eq(users.status, "Active")
        )
      );

    if (user) {
      const isValidPassword = await comparePassword(parsed.data.password, user.password);
      if (isValidPassword) {
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

        setRefreshCookie(response, refreshToken);
        return response;
      }
    }

    // 2. Fallback to .env bypass credential (all access, no DB user row)
    const creds = getBypassCreds();
    if (
      creds &&
      safeEqual(parsed.data.email, creds.email) &&
      safeEqual(parsed.data.password, creds.password)
    ) {
      console.warn("[auth] bypass credential login used");
      const accessToken = generateAccessToken({
        userId: 0,
        email: creds.email,
        firstname: "Bypass",
        lastname: "Admin",
        roleId: null,
        bypass: true,
      });

      const refreshToken = generateRefreshToken(true);

      const response = Response.json({
        data: {
          accessToken,
          user: {
            id: 0,
            email: creds.email,
            firstname: "Bypass",
            lastname: "Admin",
            roleId: null,
          },
        },
      });

      setRefreshCookie(response, refreshToken);
      return response;
    }

    return Response.json(INVALID_CREDENTIALS, { status: 401 });
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return Response.json({ error: "Login failed" }, { status: 500 });
  }
}
