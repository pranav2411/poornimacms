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

  const supabase = createAdminClient();

  try {
    const { data: updatedUser, error } = await supabase
      .from("users")
      .update({
        status: "verified",
        role: "faculty",
        verified_at: new Date().toISOString(),
        verified_by: session.user.id,
        is_verified: true, // Legacy compatibility
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error(`Error verifying user ${userId}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updatedUser);
  } catch (err) {
    console.error("Unhandled error in PATCH /api/users/[id]/verify:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
