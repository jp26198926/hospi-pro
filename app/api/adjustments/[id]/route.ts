import { NextRequest } from "next/server";
import { cancelAdjustment } from "@/lib/adjustment-stock";
import { requirePermission } from "@/lib/api-auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/adjustments", "Delete");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const adjustmentId = parseInt(id);
    if (isNaN(adjustmentId)) {
      return Response.json({ error: "Invalid adjustment ID" }, { status: 400 });
    }

    let deletedReason: string | null = null;
    try {
      const body = await request.json();
      if (body?.reason) deletedReason = String(body.reason);
    } catch {
      // no body
    }

    await cancelAdjustment(adjustmentId, auth.userId, deletedReason);
    return Response.json({ message: "Adjustment cancelled and stock reversed" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel adjustment";
    console.error("DELETE /api/adjustments/[id] error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
