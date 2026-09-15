import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, refreshTokens } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "rbac-system-secret-key-change-in-production";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export interface JwtPayload {
  userId: number;
  email: string;
  firstname: string;
  lastname: string;
  roleId: number | null;
}

// Generate access token
export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

// Generate refresh token
export function generateRefreshToken(): string {
  return jwt.sign({ type: "refresh" }, JWT_SECRET, { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` });
}

// Verify access token
export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Compare password
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Save refresh token to database
export async function saveRefreshToken(userId: number, token: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await db.insert(refreshTokens).values({
    userId,
    token,
    expiresAt,
  });
}

// Validate refresh token
export async function validateRefreshToken(token: string): Promise<number | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { type: string };
    if (decoded.type !== "refresh") return null;

    const [record] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, token),
          gt(refreshTokens.expiresAt, new Date())
        )
      );

    if (!record) return null;

    return record.userId;
  } catch {
    return null;
  }
}

// Delete refresh token
export async function deleteRefreshToken(token: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
}

// Delete all refresh tokens for a user
export async function deleteUserRefreshTokens(userId: number): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}

// Get user from access token (for API middleware)
export async function getUserFromToken(token: string) {
  const payload = verifyAccessToken(token);
  if (!payload) return null;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstname: users.firstname,
      lastname: users.lastname,
      roleId: users.roleId,
      status: users.status,
    })
    .from(users)
    .where(and(eq(users.id, payload.userId), eq(users.status, "Active")));

  return user || null;
}
