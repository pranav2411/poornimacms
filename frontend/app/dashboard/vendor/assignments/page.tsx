import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { getComplaints } from "@/lib/api";

export default async function VendorAssignmentsPage() {
  const complaints = await getComplaints();
  const assigned = complaints.filter((item) => item.status !== "Closed");

  return (
    <DashboardShell
      role="vendor"
      title="Assignments"
      subtitle="Track fixes and OTP verification"
      userName="Ravi Kumar"
      avatarUrl="/avatar-placeholder.svg"
    >
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-heading">Active list</h2>
            <p className="text-sm text-muted">Tap into each complaint.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
              All
            </span>
            <span className="rounded-full px-3 py-1">Pending</span>
            <span className="rounded-full px-3 py-1">Fixed</span>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {assigned.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/70 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-heading">
                  <span className="font-mono">{item.room}</span> - {item.title}
                </p>
                <p className="text-xs text-muted">{item.category}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={item.status} />
                <Button
                  asChild
                  className="border-accent bg-accent text-surface hover:bg-transparent hover:text-accent"
                >
                  <Link href={`/dashboard/vendor/assignments/${item.id}`}>
                    View
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </DashboardShell>
  );
}
