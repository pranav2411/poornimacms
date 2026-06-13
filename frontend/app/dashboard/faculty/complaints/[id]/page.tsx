import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import ComplaintTimeline from "@/components/ComplaintTimeline";
import { getComplaint } from "@/lib/api";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { formatDateTime } from "@/lib/utils";

export default async function FacultyComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const complaint = await getComplaint(id);

  if (complaint.createdBy !== session?.user?.id) {
    redirect("/dashboard/faculty");
  }

  return (
    <DashboardShell
      role="faculty"
      title="Complaint Details"
      subtitle="Full trace of the issue"
      userName="Dr. Aditi Sharma"
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
              <span className="text-muted">Assigned vendor</span>
              <span className="text-heading">{complaint.assignedTo ?? "Unassigned"}</span>
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
          <h3 className="text-sm font-semibold text-heading">Status timeline</h3>
          <p className="text-xs text-muted">Updated at {formatDateTime(complaint.updatedAt)}</p>
          <div className="mt-4">
            <ComplaintTimeline activeStep={2} />
          </div>
        </GlassCard>
      </div>
    </DashboardShell>
  );
}
