import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
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

  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    // 1. Delete notifications for the user
    await supabase.from("notifications").delete().eq("user_id", userId);

    // 2. Delete SOS alerts for the user
    await supabase.from("sos_alerts").delete().eq("triggered_by", userId);

    // 3. Try to delete the user
    const { data, error } = await supabase
      .from("users")
      .delete()
      .eq("id", userId)
      .select();

    if (error) {
      console.error(`Error deleting user ${userId}:`, error);
      if (error.code === "23503") {
        return NextResponse.json(
          { error: "Cannot delete user. This user has associated complaints, departments, or other active data in the system." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedUser: data[0] });
  } catch (err) {
    console.error("Unhandled error in DELETE /api/users/[id]:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
