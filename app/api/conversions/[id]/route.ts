import { NextRequest } from "next/server";
import { cancelConversion } from "@/lib/conversion-stock";
import { requirePermission } from "@/lib/api-auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/conversions", "Delete");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const conversionId = parseInt(id);
    if (isNaN(conversionId)) {
      return Response.json({ error: "Invalid conversion ID" }, { status: 400 });
    }

    let deletedReason: string | null = null;
    try {
      const body = await request.json();
      if (body?.reason) deletedReason = String(body.reason);
    } catch {
      // no body
    }

    await cancelConversion(conversionId, auth.userId, deletedReason);
    return Response.json({ message: "Conversion cancelled and stock reversed" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel conversion";
    console.error("DELETE /api/conversions/[id] error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
