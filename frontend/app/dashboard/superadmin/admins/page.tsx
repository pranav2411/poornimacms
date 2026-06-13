import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardShell from "@/components/DashboardShell";
import AdminsDirectoryClient from "./AdminsDirectoryClient";

export const dynamic = "force-dynamic";

export default async function SuperadminAdminsPage() {
  const session = await auth();

  // Validate authentication and superadmin authorization
  if (!session || !session.user) {
    redirect("/login");
  }

  if (session.user.role !== "superadmin") {
    redirect("/unauthorized");
  }

  const supabase = createAdminClient();

  // Query admins from database along with their assigned departments
  const { data: dbAdmins, error } = await supabase
    .from("users")
    .select(`
      id,
      name,
      email,
      avatar_url,
      department_admins (
        department:departments (
          name
        )
      )
    `)
    .eq("role", "admin")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching admins list:", error);
  }

  // Format admin data
  const formattedAdmins = (dbAdmins || []).map((admin) => {
    const departmentNames = (admin.department_admins || [])
      .map((da: any) => da.department?.name)
      .filter(Boolean);

    return {
      id: admin.id,
      name: admin.name || admin.email.split("@")[0],
      email: admin.email,
      image: admin.avatar_url || null,
      departments: departmentNames,
    };
  });

  return (
    <DashboardShell
      role="superadmin"
      title="Admin Management"
      subtitle="Assign categories and revoke access"
      userName={session.user.name || "Chief Admin"}
      avatarUrl={session.user.image || "/user-no-av.png"}
    >
      <AdminsDirectoryClient initialAdmins={formattedAdmins} />
    </DashboardShell>
  );
}
