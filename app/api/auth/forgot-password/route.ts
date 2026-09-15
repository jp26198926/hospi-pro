import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, parsed.data.email), eq(users.status, "Active")));

    if (!user) {
      // Don't reveal if user exists
      return Response.json({ message: "If the email exists, an OTP has been sent" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in a simple way (in production, use a separate OTP table or Redis)
    // For now, we'll store it as a text field or use a temporary approach
    // This is a simplified version - in production, use a proper OTP storage
    await db
      .update(users)
      .set({ /* otp: otp */ updatedAt: new Date() })
      .where(eq(users.id, user.id));

    // TODO: Send OTP via email or SMS using settings-mail / settings-sms
    console.log(`OTP for ${user.email}: ${otp}`);

    return Response.json({ message: "If the email exists, an OTP has been sent" });
  } catch (error) {
    console.error("POST /api/auth/forgot-password error:", error);
    return Response.json({ error: "Failed to process request" }, { status: 500 });
  }
}
