import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardShell from "@/components/DashboardShell";
import UsersManagementClient from "./UsersManagementClient";

export const dynamic = "force-dynamic";

export default async function SuperadminUsersPage() {
  const session = await auth();

  // Protect server-side route
  if (!session || !session.user) {
    redirect("/login");
  }

  if (session.user.role !== "superadmin") {
    redirect("/unauthorized");
  }

  const supabase = createAdminClient();

  // Fetch all users
  const { data: users, error } = await supabase
    .from("users")
    .select("id, email, name, image:avatar_url, role, status, created_at")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching users in Superadmin panel:", error);
  }

  const mappedUsers = (users || []).map((u) => ({
    ...u,
    role: u.role === "super_admin" ? "superadmin" : u.role,
  }));

  return (
    <DashboardShell
      role="superadmin"
      title="User Management"
      subtitle="Verify registrations and update roles"
      userName={session.user.name || "Chief Admin"}
      avatarUrl={session.user.image || "/user-no-av.png"}
    >
      <UsersManagementClient
        initialUsers={mappedUsers}
        currentUserId={session.user.id}
      />
    </DashboardShell>
  );
}
