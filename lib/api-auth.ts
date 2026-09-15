import { NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface AuthUser {
  userId: number;
  roleId: number | null;
  email: string;
}

async function resolveRoleId(
  token: string | null,
  refreshToken: string | null
): Promise<{ userId: number; roleId: number | null; email: string } | null> {
  if (token) {
    const payload = verifyAccessToken(token);
    if (payload) {
      return { userId: payload.userId, roleId: payload.roleId, email: payload.email };
    }
  }

  if (refreshToken) {
    const { validateRefreshToken } = await import("@/lib/auth");
    const userId = await validateRefreshToken(refreshToken);
    if (userId) {
      const [user] = await db
        .select({ id: users.id, roleId: users.roleId, email: users.email })
        .from(users)
        .where(eq(users.id, userId));
      if (user) {
        return { userId: user.id, roleId: user.roleId, email: user.email };
      }
    }
  }

  return null;
}

function extractTokenFromRequest(request: NextRequest): {
  token: string | null;
  refreshToken: string | null;
} {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const cookieToken = request.cookies.get("accessToken")?.value || null;
  const refreshToken = request.cookies.get("refreshToken")?.value || null;
  return { token: bearer || cookieToken, refreshToken };
}

export async function requirePermission(
  request: NextRequest,
  pagePath: string,
  permissionName: string
): Promise<AuthUser | Response> {
  const { token, refreshToken } = extractTokenFromRequest(request);
  const user = await resolveRoleId(token, refreshToken);

  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!user.roleId) {
    return Response.json({ error: "No role assigned" }, { status: 403 });
  }

  const allowed = await hasPermission(user.roleId, pagePath, permissionName);
  if (!allowed) {
    return Response.json(
      { error: `Insufficient permissions: ${permissionName} required` },
      { status: 403 }
    );
  }

  return user;
}

export async function requireAuth(request: NextRequest): Promise<AuthUser | Response> {
  const { token, refreshToken } = extractTokenFromRequest(request);
  const user = await resolveRoleId(token, refreshToken);

  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  return user;
}

export async function requirePageRead(pagePath: string): Promise<void> {
  const h = await headers();
  const authHeader = h.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("accessToken")?.value || null;
  const refreshToken = cookieStore.get("refreshToken")?.value || null;

  const token = bearer || cookieToken;
  const user = await resolveRoleId(token, refreshToken);

  if (!user || !user.roleId) {
    notFound();
  }

  const allowed = await hasPermission(user.roleId, pagePath, "Read");
  if (!allowed) {
    notFound();
  }
}
