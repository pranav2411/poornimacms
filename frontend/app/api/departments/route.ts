import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/departments - List all departments with assigned admins
export async function GET() {
  const session = await auth();

  // Validate authentication and verified status
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.status !== "verified") {
    return NextResponse.json(
      { error: "Forbidden: Account not verified" },
      { status: 403 }
    );
  }

  const supabase = createAdminClient();

  try {
    const { data: departments, error } = await supabase
      .from("departments")
      .select(`
        id,
        name,
        description,
        created_at,
        created_by,
        department_admins (
          admin_id,
          admin:users (
            id,
            name,
            email,
            image
          )
        )
      `)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching departments:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format the response to be cleaner
    const formatted = (departments || []).map((dept) => {
      const admins = (dept.department_admins || [])
        .map((da: any) => da.admin)
        .filter(Boolean);
      return {
        id: dept.id,
        name: dept.name,
        description: dept.description,
        created_at: dept.created_at,
        created_by: dept.created_by,
        admins,
      };
    });

    return NextResponse.json(formatted);
  } catch (err) {
    console.error("Unhandled error in GET /api/departments:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/departments - Create a department (Superadmin only)
export async function POST(request: Request) {
  const session = await auth();

  // Validate authentication and superadmin authorization
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      name: string;
      description?: string;
    };

    if (!body.name || body.name.trim() === "") {
      return NextResponse.json(
        { error: "Department name is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: newDept, error } = await supabase
      .from("departments")
      .insert({
        name: body.name.trim(),
        description: body.description?.trim() || null,
        created_by: session.user.id,
        head_user_id: session.user.id, // Legacy support fallback
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating department:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(newDept);
  } catch (err) {
    console.error("Unhandled error in POST /api/departments:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
