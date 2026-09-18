import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { transTypes } from "@/lib/db/schema";
import { formatReceivingNo, formatBatchNo } from "@/lib/validations/receiving-item";

export { formatUserDisplay } from "@/lib/format-user";

export async function getTransTypeIdByName(name: string): Promise<number> {
  const [row] = await db
    .select({ id: transTypes.id })
    .from(transTypes)
    .where(eq(transTypes.name, name));
  if (!row) throw new Error(`Trans type not found: ${name}`);
  return row.id;
}

export function receivingRef(receivingId: number, itemId?: number): string {
  const base = formatReceivingNo(receivingId);
  return itemId ? `${base}-${formatBatchNo(itemId)}` : base;
}

export { formatReceivingNo, formatBatchNo };
