import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardShell from "@/components/DashboardShell";
import DepartmentsManagementClient from "./DepartmentsManagementClient";

export const dynamic = "force-dynamic";

export default async function SuperadminDepartmentsPage() {
  const session = await auth();

  // Validate authentication and superadmin authorization
  if (!session || !session.user) {
    redirect("/login");
  }

  if (session.user.role !== "superadmin") {
    redirect("/unauthorized");
  }

  const supabase = createAdminClient();

  // 1. Fetch all departments with their assigned admins
  const { data: departments, error: deptError } = await supabase
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

  if (deptError) {
    console.error("Error fetching departments:", deptError);
  }

  // 2. Fetch all users whose role is 'admin'
  const { data: admins, error: adminError } = await supabase
    .from("users")
    .select("id, name, email, image")
    .eq("role", "admin")
    .order("name", { ascending: true });

  if (adminError) {
    console.error("Error fetching admins list:", adminError);
  }

  // Format department data
  const formattedDepartments = (departments || []).map((dept) => {
    const assignedAdmins = (dept.department_admins || [])
      .map((da: any) => da.admin)
      .filter(Boolean);
    return {
      id: dept.id,
      name: dept.name,
      description: dept.description,
      created_at: dept.created_at,
      created_by: dept.created_by,
      admins: assignedAdmins,
    };
  });

  return (
    <DashboardShell
      role="superadmin"
      title="Department Management"
      subtitle="Configure departments and assign administration"
      userName={session.user.name || "Chief Admin"}
      avatarUrl={session.user.image || "/user-no-av.png"}
    >
      <DepartmentsManagementClient
        initialDepartments={formattedDepartments}
        availableAdmins={admins || []}
      />
    </DashboardShell>
  );
}
