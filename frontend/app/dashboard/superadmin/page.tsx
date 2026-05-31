import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatCard from "@/components/StatCard";
import { complaints } from "@/lib/mockData";

export default function SuperadminDashboardPage() {
  const openCount = complaints.filter((item) => item.status !== "Closed").length;

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
          <h2 className="text-lg font-semibold text-heading">Operational overview</h2>
          <p className="text-sm text-muted">
            Keep tabs on assignments, approvals, and escalations.
          </p>
          <div className="mt-4 grid gap-3 text-sm text-body">
            <div className="flex items-center justify-between rounded-2xl border border-border bg-surface/70 p-4">
              <span>Other category complaints</span>
              <span className="text-heading">4 pending assignment</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-surface/70 p-4">
              <span>Average resolution time</span>
              <span className="text-heading">1.8 days</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </DashboardShell>
  );
}
