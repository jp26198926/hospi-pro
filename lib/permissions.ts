import { db } from "@/lib/db";
import { rolePermissions, pages, permissions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type PermissionMap = Record<string, string[]>;

interface CacheEntry {
  map: PermissionMap;
  viewPageIds: number[];
  time: number;
}

const cache = new Map<number, CacheEntry>();
const CACHE_TTL = 30_000;

async function loadRolePermissions(roleId: number): Promise<CacheEntry> {
  const now = Date.now();
  const hit = cache.get(roleId);
  if (hit && now - hit.time < CACHE_TTL) return hit;

  const rows = await db
    .select({
      path: pages.path,
      pageId: pages.id,
      permission: permissions.permission,
    })
    .from(rolePermissions)
    .innerJoin(pages, eq(rolePermissions.pageId, pages.id))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));

  const map: PermissionMap = {};
  const viewPageIds = new Set<number>();

  for (const r of rows) {
    if (!map[r.path]) map[r.path] = [];
    if (!map[r.path].includes(r.permission)) {
      map[r.path].push(r.permission);
    }
    if (r.permission === "View") {
      viewPageIds.add(r.pageId);
    }
  }

  const entry: CacheEntry = { map, viewPageIds: [...viewPageIds], time: now };
  cache.set(roleId, entry);
  return entry;
}

export async function hasPermission(
  roleId: number,
  pagePath: string,
  permissionName: string
): Promise<boolean> {
  if (!roleId) return false;
  const entry = await loadRolePermissions(roleId);
  return entry.map[pagePath]?.includes(permissionName) ?? false;
}

export async function getAllowedPageIds(roleId: number): Promise<number[]> {
  if (!roleId) return [];
  const entry = await loadRolePermissions(roleId);
  return entry.viewPageIds;
}

export async function getUserPermissions(roleId: number): Promise<PermissionMap> {
  if (!roleId) return {};
  const entry = await loadRolePermissions(roleId);
  return entry.map;
}

export function invalidatePermissionCache(roleId?: number) {
  if (roleId !== undefined) {
    cache.delete(roleId);
  } else {
    cache.clear();
  }
}
