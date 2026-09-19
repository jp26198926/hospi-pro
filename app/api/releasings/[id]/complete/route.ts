import { NextRequest } from "next/server";
import { formatReleasingNo } from "@/lib/validations/releasing-item";
import { completeReleasing } from "@/lib/releasing-stock";
import { requirePermission } from "@/lib/api-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "/releasings", "Edit");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const releasingId = parseInt(id);
    if (isNaN(releasingId)) {
      return Response.json({ error: "Invalid releasing ID" }, { status: 400 });
    }

    const data = await completeReleasing(releasingId, auth.userId);
    return Response.json({
      data: { ...data, transNo: formatReleasingNo(data.id) },
      message: "Releasing completed and stock posted",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to complete releasing";
    console.error("POST /api/releasings/[id]/complete error:", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
