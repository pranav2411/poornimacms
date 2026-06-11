import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const session = await auth();

  // Validate authentication
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate authorization (only superadmin can add users)
  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { email, role, name } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    const cleanedEmail = email.trim().toLowerCase();
    
    // Validate email domain
    if (!cleanedEmail.endsWith("@poornima.org")) {
      return NextResponse.json(
        { error: "Only @poornima.org emails are allowed" },
        { status: 400 }
      );
    }

    const validRoles = ["superadmin", "admin", "faculty", "vendor"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if user with this email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("email", cleanedEmail)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing user:", checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Set default name to email prefix if not supplied
    const defaultName = name?.trim() || cleanedEmail.split("@")[0];

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        email: cleanedEmail,
        role: role,
        name: defaultName,
        status: "verified",
        is_verified: true, // Legacy compatibility
        is_active: true,
        verified_at: new Date().toISOString(),
        verified_by: session.user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting pre-verified user:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (err) {
    console.error("Unhandled error in POST /api/users:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
