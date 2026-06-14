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
          image:avatar_url
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
    .select("id, name, email, image:avatar_url")
    .eq("role", "admin")
    .order("name", { ascending: true });

  if (adminError) {
    console.error("Error fetching admins list:", adminError);
  }

  // 3. Fetch all users whose role is 'vendor'
  const { data: vendors, error: vendorError } = await supabase
    .from("users")
    .select("id, name, email, image:avatar_url, department_id")
    .eq("role", "vendor")
    .order("name", { ascending: true });

  if (vendorError) {
    console.error("Error fetching vendors list:", vendorError);
  }

  // 4. Fetch department vendor mappings
  let deptVendors: any[] = [];
  const { data: dvData, error: deptVendorsError } = await supabase
    .from("department_vendors")
    .select(`
      department_id,
      vendor:users (
        id,
        name,
        email,
        image:avatar_url
      )
    `);

  if (deptVendorsError) {
    console.error("Error fetching department vendors mapping (falling back to legacy column):", deptVendorsError);
  } else {
    deptVendors = dvData || [];
  }

  // Format department data
  const formattedDepartments = (departments || []).map((dept) => {
    const assignedAdmins = (dept.department_admins || [])
      .map((da: any) => da.admin)
      .filter(Boolean);
      
    // Fallback: If mapping query failed, fetch from the legacy user.department_id column
    const assignedVendors = deptVendorsError
      ? (vendors || [])
          .filter((v: any) => v.department_id === dept.id)
          .map((v: any) => ({
            id: v.id,
            name: v.name,
            email: v.email,
            image: v.image,
          }))
      : (deptVendors || [])
          .filter((dv: any) => dv.department_id === dept.id)
          .map((dv: any) => dv.vendor)
          .filter(Boolean);

    return {
      id: dept.id,
      name: dept.name,
      description: dept.description,
      created_at: dept.created_at,
      created_by: dept.created_by,
      admins: assignedAdmins,
      vendors: assignedVendors,
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
        availableVendors={vendors || []}
      />
    </DashboardShell>
  );
}
