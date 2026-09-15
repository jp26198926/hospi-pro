import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { settingsCloudinary } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return Response.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    // Fetch saved Cloudinary settings
    const [settings] = await db.select().from(settingsCloudinary).where(eq(settingsCloudinary.id, 1));

    if (!settings || !settings.cloudinaryName || !settings.cloudinaryApiKey || !settings.cloudinaryApiSecret) {
      return Response.json({ error: "Cloudinary settings not configured. Please save settings first." }, { status: 400 });
    }

    // Generate timestamp for signature
    const timestamp = Math.round(new Date().getTime() / 1000);

    // Create signature for Cloudinary upload
    // Signature must include all non-file params in alphabetical order
    const paramsToSign = `folder=rbac-test&timestamp=${timestamp}`;
    const signature = crypto
      .createHash("sha1")
      .update(paramsToSign + settings.cloudinaryApiSecret)
      .digest("hex");

    // Upload to Cloudinary
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("api_key", settings.cloudinaryApiKey);
    uploadFormData.append("timestamp", String(timestamp));
    uploadFormData.append("signature", signature);
    uploadFormData.append("folder", "rbac-test");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${settings.cloudinaryName}/image/upload`,
      {
        method: "POST",
        body: uploadFormData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return Response.json(
        { error: `Upload failed: ${errorData.error?.message || response.statusText}` },
        { status: 500 }
      );
    }

    const result = await response.json();

    return Response.json({
      message: "Test upload successful",
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error: any) {
    console.error("POST /api/settings-cloudinary/test error:", error);
    return Response.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
  }
}
