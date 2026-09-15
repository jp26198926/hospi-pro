import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, roles, departments } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { profileSchema } from "@/lib/validations/auth";

export async function GET(request: NextRequest) {
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

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstname: users.firstname,
        lastname: users.lastname,
        departmentId: users.departmentId,
        departmentName: departments.department,
        roleId: users.roleId,
        roleName: roles.role,
        status: users.status,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.id, payload.userId), eq(users.status, "Active")));

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ data: user });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return Response.json({ error: "Failed to get user" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Check email uniqueness
    const [conflict] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, parsed.data.email),
          ne(users.id, payload.userId),
          eq(users.status, "Active")
        )
      );

    if (conflict) {
      return Response.json({ error: "Email already exists" }, { status: 409 });
    }

    const [updated] = await db
      .update(users)
      .set({
        firstname: parsed.data.firstname,
        lastname: parsed.data.lastname,
        email: parsed.data.email,
        updatedAt: new Date(),
      })
      .where(eq(users.id, payload.userId))
      .returning();

    const { password: _, ...userWithoutPassword } = updated;

    return Response.json({ data: userWithoutPassword });
  } catch (error) {
    console.error("PUT /api/auth/me error:", error);
    return Response.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
