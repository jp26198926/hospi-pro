import { getTransTypeIdByName } from "@/lib/receivings";
import {
  formatReleasingNo,
  formatReleasingItemNo,
} from "@/lib/validations/releasing-item";

export { formatUserDisplay } from "@/lib/format-user";
export { getTransTypeIdByName };

export function releasingRef(releasingId: number, itemId?: number): string {
  const base = formatReleasingNo(releasingId);
  return itemId ? `${base}-${formatReleasingItemNo(itemId)}` : base;
}

export { formatReleasingNo, formatReleasingItemNo };
