import { NextRequest } from "next/server";
import { formatReceivingNo } from "@/lib/validations/receiving-item";
import { completeReceiving } from "@/lib/receiving-stock";
import { requirePermission } from "@/lib/api-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/receivings", "Edit");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const receivingId = parseInt(id);
    if (isNaN(receivingId)) {
      return Response.json({ error: "Invalid receiving ID" }, { status: 400 });
    }

    const data = await completeReceiving(receivingId, auth.userId);

    return Response.json({
      data: { ...data, transNo: formatReceivingNo(data.id) },
      message: "Receiving completed and stock posted",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to complete receiving";
    console.error("POST /api/receivings/[id]/complete error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
