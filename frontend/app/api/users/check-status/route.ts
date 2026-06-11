import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  // Validate authentication (regardless of status/role)
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const { data: dbUser, error } = await supabase
      .from("users")
      .select("role, status")
      .eq("email", session.user.email)
      .single();

    if (error) {
      console.error(`Error checking status for ${session.user.email}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: dbUser.status,
      role: dbUser.role,
    });
  } catch (err) {
    console.error("Unhandled error in GET /api/users/check-status:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
