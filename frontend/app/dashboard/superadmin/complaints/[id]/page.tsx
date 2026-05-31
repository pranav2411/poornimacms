import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import ComplaintTimeline from "@/components/ComplaintTimeline";
import { getComplaint } from "@/lib/api";

export default async function SuperadminComplaintDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const complaint = await getComplaint(params.id);

  return (
    <DashboardShell
      role="superadmin"
      title="Complaint Detail"
      subtitle="System-wide timeline"
      userName="Chief Admin"
      avatarUrl="/avatar-placeholder.svg"
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                {complaint.id}
              </p>
              <h2 className="text-2xl font-semibold text-heading">
                {complaint.title}
              </h2>
            </div>
            <StatusPill status={complaint.status} />
          </div>
          <div className="mt-4 grid gap-3 text-sm text-body">
            <div className="flex items-center justify-between">
              <span className="text-muted">Room</span>
              <span className="font-mono text-heading">{complaint.room}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Category</span>
              <span className="text-heading">{complaint.category}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Assigned vendor</span>
              <span className="text-heading">{complaint.assignedTo ?? "Unassigned"}</span>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <h3 className="text-sm font-semibold text-heading">Status timeline</h3>
          <p className="text-xs text-muted">Updated at {complaint.updatedAt}</p>
          <div className="mt-4">
            <ComplaintTimeline activeStep={3} />
          </div>
        </GlassCard>
      </div>
    </DashboardShell>
  );
}
