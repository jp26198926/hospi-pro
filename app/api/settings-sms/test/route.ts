import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { settingsSms } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return Response.json({ error: "Phone number is required" }, { status: 400 });
    }

    // Fetch saved TextBee settings
    const [settings] = await db.select().from(settingsSms).where(eq(settingsSms.id, 1));

    if (!settings || !settings.textbeeApiKey) {
      return Response.json({ error: "TextBee settings not configured. Please save settings first." }, { status: 400 });
    }

    // Build request body per TextBee API docs
    const requestBody: Record<string, unknown> = {
      recipients: [phoneNumber],
      message: "Test SMS from RBAC System. If you received this message, your SMS settings are configured correctly.",
    };

    // Optionally target a specific device
    if (settings.textbeeDeviceId) {
      requestBody.deviceId = settings.textbeeDeviceId;
    }

    // Send test SMS via TextBee API
    const response = await fetch(
      "https://api.textbee.dev/api/v1/gateway/send-sms",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": settings.textbeeApiKey,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return Response.json(
        { error: `Failed to send SMS: ${errorData.message || response.statusText}` },
        { status: 500 }
      );
    }

    return Response.json({ message: "Test SMS sent successfully" });
  } catch (error: any) {
    console.error("POST /api/settings-sms/test error:", error);
    return Response.json({ error: `Failed to send test SMS: ${error.message}` }, { status: 500 });
  }
}
