import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { settingsMail } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import { requirePermission } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "/settings-mail", "Edit");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { recipientEmail } = body;

    if (!recipientEmail) {
      return Response.json({ error: "Recipient email is required" }, { status: 400 });
    }

    // Fetch saved SMTP settings
    const [settings] = await db.select().from(settingsMail).where(eq(settingsMail.id, 1));

    if (!settings || !settings.smtpHost) {
      return Response.json({ error: "SMTP settings not configured. Please save settings first." }, { status: 400 });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpCrypto === "SSL",
      auth: settings.smtpUsername ? {
        user: settings.smtpUsername,
        pass: settings.smtpPassword || "",
      } : undefined,
    });

    // Send test email
    await transporter.sendMail({
      from: `"${settings.smtpSenderName || "Test"}" <${settings.smtpFromEmail || settings.smtpUsername}>`,
      to: recipientEmail,
      subject: "Test Email from RBAC System",
      html: `
        <h2>Test Email</h2>
        <p>This is a test email from the RBAC System.</p>
        <p>If you received this email, your SMTP settings are configured correctly.</p>
        <hr>
        <p style="color: #999; font-size: 12px;">Sent from RBAC System</p>
      `,
    });

    return Response.json({ message: "Test email sent successfully" });
  } catch (error: any) {
    console.error("POST /api/settings-mail/test error:", error);
    return Response.json({ error: `Failed to send test email: ${error.message}` }, { status: 500 });
  }
}
