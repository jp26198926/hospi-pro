import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { rolePermissions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rpId = parseInt(id);

    if (isNaN(rpId)) {
      return Response.json({ error: "Invalid ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.id, rpId));

    if (!existing) {
      return Response.json({ error: "Role permission not found" }, { status: 404 });
    }

    // Hard delete
    await db.delete(rolePermissions).where(eq(rolePermissions.id, rpId));

    return Response.json({ message: "Role permission deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/role-permissions/[id] error:", error);
    return Response.json({ error: "Failed to delete role permission" }, { status: 500 });
  }
}
