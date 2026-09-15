import { db } from "@/lib/db";
import { settingsApp } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface AppSettings {
  appLogo: string | null;
  appFavicon: string | null;
  appName: string;
  appTagline: string | null;
}

let cached: AppSettings | null = null;
let cacheTime = 0;
const CACHE_TTL = 30_000; // 30 seconds

export async function getAppSettings(): Promise<AppSettings> {
  const now = Date.now();
  if (cached && now - cacheTime < CACHE_TTL) {
    return cached;
  }

  try {
    const [settings] = await db.select().from(settingsApp).where(eq(settingsApp.id, 1));

    cached = {
      appLogo: settings?.appLogo ?? null,
      appFavicon: settings?.appFavicon ?? null,
      appName: settings?.appName ?? "RBAC System",
      appTagline: settings?.appTagline ?? null,
    };
    cacheTime = now;
    return cached;
  } catch {
    return {
      appLogo: null,
      appFavicon: null,
      appName: "RBAC System",
      appTagline: null,
    };
  }
}
