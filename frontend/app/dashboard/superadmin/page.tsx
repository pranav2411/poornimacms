import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import { getComplaints } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import UnassignedComplaintsClient from "./UnassignedComplaintsClient";
import RefreshButton from "@/components/RefreshButton";
import { auth } from "@/auth";

export default async function SuperadminDashboardPage() {
  const session = await auth();
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

  // Fetch real counts for vendors and admins
  const { count: vendorsCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "vendor");

  const { count: adminsCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");

  // Calculate dynamic average resolution time
  const resolvedComplaints = complaints.filter(
    (c) =>
      (["fixed", "done", "closed", "resolved"].includes(String(c.status).toLowerCase()) || c.resolvedAt) &&
      c.createdAt &&
      c.resolvedAt
  );

  let avgResolutionDays = "N/A";
  if (resolvedComplaints.length > 0) {
    const totalMs = resolvedComplaints.reduce((acc, c) => {
      const created = new Date(c.createdAt).getTime();
      const resolved = new Date(c.resolvedAt!).getTime();
      return acc + (resolved - created);
    }, 0);
    const avgMs = totalMs / resolvedComplaints.length;
    const avgDays = avgMs / (1000 * 60 * 60 * 24);
    avgResolutionDays = `${avgDays.toFixed(1)} days`;
  }

  return (
    <DashboardShell
      role="superadmin"
      title="Superadmin Dashboard"
      subtitle="Institution-wide control center"
      userName={session?.user?.name || "Chief Admin"}
      avatarUrl={session?.user?.image || "/user-no-av.png"}
      headerActions={<RefreshButton />}
    >
      <div className="grid gap-8">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Open complaints" value={openCount} />
          <StatCard label="Total vendors" value={vendorsCount ?? 0} />
          <StatCard label="Active admins" value={adminsCount ?? 0} />
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
              <span className="text-heading">{avgResolutionDays}</span>
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

