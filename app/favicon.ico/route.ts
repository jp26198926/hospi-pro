import { db } from "@/lib/db";
import { settingsApp } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const [settings] = await db.select().from(settingsApp).where(eq(settingsApp.id, 1));

    if (settings?.appFavicon) {
      // appFavicon is a URL like /uploads/settings-application/1234567890-favicon.png
      // Resolve the file path from public directory
      const filePath = path.join(process.cwd(), "public", settings.appFavicon);
      const fileBuffer = await readFile(filePath);

      // Determine content type from extension
      const ext = settings.appFavicon.split(".").pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        ico: "image/x-icon",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        svg: "image/svg+xml",
        webp: "image/webp",
      };
      const contentType = contentTypes[ext || ""] || "image/x-icon";

      return new Response(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // Default: serve a minimal 1x1 transparent ICO
    const defaultIco = Buffer.from(
      "AAABAAEAAQEAAAEAGAAwAAAAFgAAACgAAAABAAAAAgAAAAEAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAA=",
      "base64"
    );
    return new Response(defaultIco, {
      headers: {
        "Content-Type": "image/x-icon",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("GET /favicon.ico error:", error);
    // Fallback to transparent 1x1 ICO
    const defaultIco = Buffer.from(
      "AAABAAEAAQEAAAEAGAAwAAAAFgAAACgAAAABAAAAAgAAAAEAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAA=",
      "base64"
    );
    return new Response(defaultIco, {
      headers: { "Content-Type": "image/x-icon" },
    });
  }
}
