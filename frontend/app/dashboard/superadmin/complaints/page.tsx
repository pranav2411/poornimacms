import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import { getComplaints } from "@/lib/api";
import Link from "next/link";

export default async function SuperadminComplaintsPage() {
  const complaints = await getComplaints();
  return (
    <DashboardShell
      role="superadmin"
      title="All Complaints"
      subtitle="Every complaint across categories"
      userName="Chief Admin"
      avatarUrl="/user-no-av.png"
    >
      <GlassCard className="p-6">
        <div className="grid gap-3">
          <div className="grid grid-cols-7 gap-2 border-b border-border pb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            <span>ID</span>
            <span>Room</span>
            <span>Category</span>
            <span>Status</span>
            <span>Assigned</span>
            <span>Creator</span>
            <span className="text-right">Actions</span>
          </div>
          {complaints.map((item) => (
            <div key={item.id} className="grid grid-cols-7 gap-2 text-sm text-body items-center py-2 hover:bg-surface/30 px-2 rounded-xl transition-all duration-150">
              <span className="font-medium text-heading font-mono text-xs truncate" title={item.id}>{item.id}</span>
              <span className="font-mono text-heading">{item.room}</span>
              <span>{item.category}</span>
              <div>
                <StatusPill status={item.status} />
              </div>
              <span>{item.assignedTo ?? "Unassigned"}</span>
              <span className="truncate" title={item.createdByName}>{item.createdByName || "Faculty User"}</span>
              <div className="text-right">
                <Link
                  href={`/dashboard/superadmin/complaints/${item.id}`}
                  className="inline-flex rounded-full border border-primary bg-primary text-white hover:bg-transparent hover:text-primary text-2xs font-semibold py-1.5 px-4.5 shadow-sm transition-all duration-200"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </DashboardShell>
  );
}
