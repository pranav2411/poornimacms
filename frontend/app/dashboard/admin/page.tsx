import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import { getComplaints } from "@/lib/api";

export default async function AdminDashboardPage() {
  const complaints = await getComplaints();
  const assigned = complaints.filter((item) => item.status !== "Closed");

  return (
    <DashboardShell
      role="admin"
      title="Admin Dashboard"
      subtitle="Monitor your category complaints"
      userName="Admin Desk"
      avatarUrl="/user-no-av.png"
    >
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-heading">Assigned queue</h2>
        <p className="text-sm text-muted">
          Assign vendors and track resolution.
        </p>
        <div className="mt-4 grid gap-3">
          {assigned.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/70 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-heading">
                  {item.title}
                </p>
                <p className="text-xs text-muted">
                  {item.room} - {item.category}
                </p>
              </div>
              <StatusPill status={item.status} />
            </div>
          ))}
        </div>
      </GlassCard>
    </DashboardShell>
  );
}
