import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();

  // Validate authentication and superadmin authorization
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Query user by email
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, name, image:avatar_url, role, status")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("Error searching user by email:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "super_admin") {
      user.role = "superadmin";
    }

    return NextResponse.json(user);
  } catch (err) {
    console.error("Unhandled error in GET /api/users/by-email:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
