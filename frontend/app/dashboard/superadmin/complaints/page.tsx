import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import { complaints } from "@/lib/mockData";

export default function SuperadminComplaintsPage() {
  return (
    <DashboardShell
      role="superadmin"
      title="All Complaints"
      subtitle="Every complaint across categories"
      userName="Chief Admin"
      avatarUrl="/avatar-placeholder.svg"
    >
      <GlassCard className="p-6">
        <div className="grid gap-3">
          <div className="grid grid-cols-6 gap-2 border-b border-border pb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            <span>ID</span>
            <span>Room</span>
            <span>Category</span>
            <span>Status</span>
            <span>Assigned</span>
            <span>Updated</span>
          </div>
          {complaints.map((item) => (
            <div key={item.id} className="grid grid-cols-6 gap-2 text-sm text-body">
              <span className="font-medium text-heading">{item.id}</span>
              <span className="font-mono text-heading">{item.room}</span>
              <span>{item.category}</span>
              <StatusPill status={item.status} />
              <span>{item.assignedTo ?? "Unassigned"}</span>
              <span className="text-muted">{item.updatedAt}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </DashboardShell>
  );
}
