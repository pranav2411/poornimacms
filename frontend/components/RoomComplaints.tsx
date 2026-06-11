import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Complaint } from "@/lib/types";

export default function RoomComplaints({
  complaints,
  expanded,
  isLoading,
}: {
  complaints: Complaint[];
  expanded: boolean;
  isLoading: boolean;
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
        <span className="text-xs text-muted">
          {isLoading ? "Checking..." : `${complaints.length} open`}
        </span>
      </div>
      <div className="mt-3 grid gap-3">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, index) => (
            <div
              key={`room-skeleton-${index}`}
              className="rounded-2xl border border-border bg-surface/45 p-3 animate-pulse"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-2 h-3 w-3/4" />
            </div>
          ))
        ) : complaints.length === 0 ? (
          <p className="text-xs text-muted py-2 text-center">No active complaints found for this room.</p>
        ) : (
          complaints.map((complaint) => (
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
          ))
        )}
      </div>
    </GlassCard>
  );
}
