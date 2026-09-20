import { NextRequest } from "next/server";
import { formatTransferNo } from "@/lib/validations/transfer-item";
import { completeTransfer } from "@/lib/transfer-stock";
import { requirePermission } from "@/lib/api-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/transfers", "Edit");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const transferId = parseInt(id);
    if (isNaN(transferId)) {
      return Response.json({ error: "Invalid transfer ID" }, { status: 400 });
    }

    const data = await completeTransfer(transferId, auth.userId);
    return Response.json({
      data: { ...data, transNo: formatTransferNo(data.id) },
      message: "Transfer completed and stock moved",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to complete transfer";
    console.error("POST /api/transfers/[id]/complete error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
