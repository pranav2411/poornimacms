import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import { getComplaints } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import UnassignedComplaintsClient from "./UnassignedComplaintsClient";

export default async function SuperadminDashboardPage() {
  const complaints = await getComplaints();
  const openCount = complaints.filter((item) => item.status !== "Closed").length;
  
  // Filter complaints which haven't been assigned any vendor yet, and are not closed/fixed
  const unassigned = complaints.filter(
    (item) => !item.assignedTo && item.status !== "Closed" && item.status !== "Fixed"
  );

  const supabase = createAdminClient();
  const { data: depts } = await supabase
    .from("departments")
    .select("name")
    .order("name", { ascending: true });
  const departmentNames = (depts || []).map((d) => d.name);

  return (
    <DashboardShell
      role="superadmin"
      title="Superadmin Dashboard"
      subtitle="Institution-wide control center"
      userName="Chief Admin"
      avatarUrl="/user-no-av.png"
    >
      <div className="grid gap-8">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Open complaints" value={openCount} />
          <StatCard label="Total vendors" value={12} />
          <StatCard label="Active admins" value={6} />
        </div>

        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-heading font-jakarta">Operational overview</h2>
          <p className="text-sm text-muted">
            Keep tabs on assignments, approvals, and escalations.
          </p>
          <div className="mt-4 grid gap-3 text-sm text-body">
            <div className="flex items-center justify-between rounded-2xl border border-border bg-surface/70 p-4">
              <span>Unassigned complaints (Any department)</span>
              <span className="text-heading font-semibold">{unassigned.length} pending assignment</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-surface/70 p-4">
              <span>Average resolution time</span>
              <span className="text-heading">1.8 days</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-heading font-jakarta">Unassigned Complaints</h2>
          <p className="text-sm text-muted mb-4">
            These complaints require immediate assignment to a vendor.
          </p>

          <UnassignedComplaintsClient
            initialComplaints={unassigned}
            existingDepartments={departmentNames}
          />
        </GlassCard>
      </div>
    </DashboardShell>
  );
}
