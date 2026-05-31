import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { complaints } from "@/lib/mockData";

export default function VendorAssignmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const complaint = complaints.find((item) => item.id === params.id) ?? complaints[0];

  return (
    <DashboardShell
      role="vendor"
      title="Assignment details"
      subtitle="Mark work as fixed and verify OTP"
      userName="Ravi Kumar"
      avatarUrl="/user-no-av.png"
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
              <span className="text-muted">Priority</span>
              <span className="text-heading">{complaint.priority}</span>
            </div>
          </div>
          <p className="mt-6 text-sm text-body/80">
            {complaint.description}
          </p>
        </GlassCard>
        <GlassCard className="p-6">
          <p className="text-sm font-semibold text-heading">Repair actions</p>
          <p className="text-xs text-muted">Send OTP once the fix is complete.</p>
          <Button
            asChild
            className="mt-4 border-fixed bg-fixed text-surface hover:bg-transparent hover:text-fixed"
          >
            <Link href={`/dashboard/vendor/assignments/${complaint.id}/otp`}>
              Mark as Fixed
            </Link>
          </Button>
        </GlassCard>
      </div>
    </DashboardShell>
  );
}
