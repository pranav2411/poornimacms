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

  const { id: departmentId } = await params;
  if (!departmentId) {
    return NextResponse.json(
      { error: "Department ID is required" },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      adminIds?: string[]; // Array of admin user IDs to assign
    };

    const supabase = createAdminClient();

    // 1. Update basic department details if provided
    const updatePayload: Record<string, any> = {};
    if (body.name !== undefined) updatePayload.name = body.name.trim();
    if (body.description !== undefined)
      updatePayload.description = body.description.trim() || null;

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabase
        .from("departments")
        .update(updatePayload)
        .eq("id", departmentId);

      if (updateError) {
        console.error(`Error updating department ${departmentId}:`, updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    // 2. Sync assigned admins if adminIds is provided
    if (body.adminIds !== undefined) {
      const requestedAdminIds = body.adminIds;

      // Validate that these user IDs actually exist and are admins
      if (requestedAdminIds.length > 0) {
        const { data: dbAdmins, error: validationError } = await supabase
          .from("users")
          .select("id")
          .in("id", requestedAdminIds)
          .eq("role", "admin");

        if (validationError) {
          console.error("Error validating admin IDs:", validationError);
          return NextResponse.json(
            { error: "Error validating assigned admins" },
            { status: 500 }
          );
        }

        const validDbAdminIds = dbAdmins?.map((u) => u.id) || [];
        if (validDbAdminIds.length !== requestedAdminIds.length) {
          return NextResponse.json(
            { error: "One or more user IDs are not valid admins" },
            { status: 400 }
          );
        }
      }

      // Fetch currently assigned admins
      const { data: currentAdmins, error: selectError } = await supabase
        .from("department_admins")
        .select("admin_id")
        .eq("department_id", departmentId);

      if (selectError) {
        console.error("Error querying current department admins:", selectError);
        return NextResponse.json({ error: selectError.message }, { status: 500 });
      }

      const currentAdminIds = currentAdmins?.map((a) => a.admin_id) || [];

      // Diffs
      const adminsToAdd = requestedAdminIds.filter(
        (id) => !currentAdminIds.includes(id)
      );
      const adminsToRemove = currentAdminIds.filter(
        (id) => !requestedAdminIds.includes(id)
      );

      // Additions
      if (adminsToAdd.length > 0) {
        const insertData = adminsToAdd.map((adminId) => ({
          department_id: departmentId,
          admin_id: adminId,
        }));
        const { error: insertError } = await supabase
          .from("department_admins")
          .insert(insertData);

        if (insertError) {
          console.error("Error inserting department admins:", insertError);
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
      }

      // Deletions
      if (adminsToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("department_admins")
          .delete()
          .eq("department_id", departmentId)
          .in("admin_id", adminsToRemove);

        if (deleteError) {
          console.error("Error deleting department admins:", deleteError);
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unhandled error in PATCH /api/departments/[id]:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
