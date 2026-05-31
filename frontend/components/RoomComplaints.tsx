import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import type { Complaint } from "@/lib/types";

export default function RoomComplaints({
  complaints,
  expanded,
}: {
  complaints: Complaint[];
  expanded: boolean;
}) {
  if (!expanded) return null;

  return (
    <GlassCard className="mt-4 p-4 glass-grid">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-heading">
            Pending complaints from this room
          </p>
          <p className="text-xs text-muted">
            Check existing issues before raising a new one.
          </p>
        </div>
        <span className="text-xs text-muted">{complaints.length} open</span>
      </div>
      <div className="mt-3 grid gap-3">
        {complaints.map((complaint) => (
          <div
            key={complaint.id}
            className="rounded-2xl border border-border bg-surface/80 p-3"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-heading">
                  {complaint.title}
                </p>
                <p className="text-xs text-muted">{complaint.category}</p>
              </div>
              <StatusPill status={complaint.status} />
            </div>
            <p className="mt-2 text-xs text-body/80">{complaint.description}</p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
