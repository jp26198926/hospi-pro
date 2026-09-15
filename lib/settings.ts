import { db } from "@/lib/db";
import { settingsApp, timezones } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface AppSettings {
  appLogo: string | null;
  appFavicon: string | null;
  appName: string;
  appTagline: string | null;
  timezone: string | null;
}

let cached: AppSettings | null = null;
let cacheTime = 0;
const CACHE_TTL = 30_000; // 30 seconds

let cachedTz: string | null = null;
let tzCacheTime = 0;

export async function getAppTimezone(): Promise<string> {
  const now = Date.now();
  if (cachedTz !== null && now - tzCacheTime < CACHE_TTL) {
    return cachedTz;
  }

  try {
    const [row] = await db
      .select({ timezone: timezones.timezone })
      .from(settingsApp)
      .leftJoin(timezones, eq(settingsApp.timezoneId, timezones.id))
      .where(eq(settingsApp.id, 1));

    cachedTz = row?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    cachedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  tzCacheTime = now;
  return cachedTz;
}

export async function getAppSettings(): Promise<AppSettings> {
  const now = Date.now();
  if (cached && now - cacheTime < CACHE_TTL) {
    return cached;
  }

  try {
    const [row] = await db
      .select({
        appLogo: settingsApp.appLogo,
        appFavicon: settingsApp.appFavicon,
        appName: settingsApp.appName,
        appTagline: settingsApp.appTagline,
        timezone: timezones.timezone,
      })
      .from(settingsApp)
      .leftJoin(timezones, eq(settingsApp.timezoneId, timezones.id))
      .where(eq(settingsApp.id, 1));

    cached = {
      appLogo: row?.appLogo ?? null,
      appFavicon: row?.appFavicon ?? null,
      appName: row?.appName ?? "RBAC System",
      appTagline: row?.appTagline ?? null,
      timezone: row?.timezone ?? null,
    };
    cacheTime = now;
    return cached;
  } catch {
    return {
      appLogo: null,
      appFavicon: null,
      appName: "RBAC System",
      appTagline: null,
      timezone: null,
    };
  }
}
