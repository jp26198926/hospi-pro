import { getTransTypeIdByName } from "@/lib/receivings";
import { formatTransferNo, formatTransferItemNo } from "@/lib/validations/transfer-item";

export { formatUserDisplay } from "@/lib/format-user";
export { getTransTypeIdByName };

export function transferRef(transferId: number, itemId?: number): string {
  const base = formatTransferNo(transferId);
  return itemId ? `${base}-${formatTransferItemNo(itemId)}` : base;
}

export { formatTransferNo, formatTransferItemNo };
