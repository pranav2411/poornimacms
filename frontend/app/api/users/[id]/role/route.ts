import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  // Validate authentication and superadmin authorization
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as { role: string | null };
    const targetRole = body.role;

    // Validate the requested role value
    const validRoles = ["superadmin", "admin", "faculty", "vendor", "unverified"];
    if (targetRole !== null && !validRoles.includes(targetRole)) {
      return NextResponse.json({ error: "Invalid role value" }, { status: 400 });
    }

    const supabase = createAdminClient();

    let updatePayload: Record<string, any> = {};

    if (targetRole === "unverified" || targetRole === null) {
      updatePayload = {
        role: null,
        status: "pending",
        is_verified: false, // Legacy compatibility
      };
    } else {
      updatePayload = {
        role: targetRole === "superadmin" ? "super_admin" : targetRole,
        status: "verified",
        is_verified: true, // Legacy compatibility
      };
    }

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update(updatePayload)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error(`Error updating role for user ${userId}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updatedUser);
  } catch (err) {
    console.error("Unhandled error in PATCH /api/users/[id]/role:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
