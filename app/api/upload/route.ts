import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { db } from "@/lib/db";
import { settingsApp, settingsCloudinary } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-auth";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string || "settings-application";

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ error: "File size must be less than 2MB" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return Response.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    // Check primary storage setting
    const [settings] = await db.select().from(settingsApp).where(eq(settingsApp.id, 1));
    const primaryStorage = settings?.primaryStorage || "filesystem";

    if (primaryStorage === "cloudinary") {
      // Upload to Cloudinary
      const [cloudinarySettings] = await db.select().from(settingsCloudinary).where(eq(settingsCloudinary.id, 1));

      if (!cloudinarySettings || !cloudinarySettings.cloudinaryName || !cloudinarySettings.cloudinaryApiKey || !cloudinarySettings.cloudinaryApiSecret) {
        return Response.json({ error: "Cloudinary settings not configured. Please configure Cloudinary or switch to File System storage." }, { status: 400 });
      }

      const timestamp = Math.round(new Date().getTime() / 1000);
      const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
      const signature = crypto
        .createHash("sha1")
        .update(paramsToSign + cloudinarySettings.cloudinaryApiSecret)
        .digest("hex");

      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("api_key", cloudinarySettings.cloudinaryApiKey);
      uploadFormData.append("timestamp", String(timestamp));
      uploadFormData.append("signature", signature);
      uploadFormData.append("folder", folder);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinarySettings.cloudinaryName}/image/upload`,
        { method: "POST", body: uploadFormData }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return Response.json(
          { error: `Upload failed: ${errorData.error?.message || response.statusText}` },
          { status: 500 }
        );
      }

      const result = await response.json();
      return Response.json({ url: result.secure_url });
    }

    // Default: File System upload
    const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${safeName}`;
    const filepath = path.join(uploadDir, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    const url = `/uploads/${folder}/${filename}`;
    return Response.json({ url });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return Response.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
