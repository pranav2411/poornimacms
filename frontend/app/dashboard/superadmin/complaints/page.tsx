import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import { getComplaints } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import ComplaintsListClient from "./ComplaintsListClient";
import RefreshButton from "@/components/RefreshButton";

export default async function SuperadminComplaintsPage() {
  const complaints = await getComplaints();

  // Fetch department names to populate the department filter
  const supabase = createAdminClient();
  const { data: depts } = await supabase
    .from("departments")
    .select("name")
    .order("name", { ascending: true });
  const departmentNames = (depts || []).map((d) => d.name);

  return (
    <DashboardShell
      role="superadmin"
      title="All Complaints"
      subtitle="Every complaint across categories"
      userName="Chief Admin"
      avatarUrl="/user-no-av.png"
      headerActions={<RefreshButton />}
    >
      <GlassCard className="p-6">
        <ComplaintsListClient
          initialComplaints={complaints}
          departments={departmentNames}
        />
      </GlassCard>
    </DashboardShell>
  );
}
