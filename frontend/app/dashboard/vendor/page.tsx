import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import { getComplaints } from "@/lib/api";

export default async function VendorDashboardPage() {
  const complaints = await getComplaints();
  const assigned = complaints.filter((item) => item.status !== "Closed");

  return (
    <DashboardShell
      role="vendor"
      title="Vendor Dashboard"
      subtitle="Assigned repairs and next steps"
      userName="Ravi Kumar"
      avatarUrl="/user-no-av.png"
    >
      <div className="grid gap-6">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-heading">
            Assigned complaints
          </h2>
          <p className="text-sm text-muted">
            Filter by status and update progress.
          </p>
          <div className="mt-4 grid gap-3">
            {assigned.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-border bg-surface/70 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-heading">
                      {item.room}
                    </p>
                    <p className="text-xs text-muted">{item.category}</p>
                  </div>
                  <StatusPill status={item.status} />
                </div>
                <p className="mt-3 text-sm text-body/80">{item.description}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </DashboardShell>
  );
}
