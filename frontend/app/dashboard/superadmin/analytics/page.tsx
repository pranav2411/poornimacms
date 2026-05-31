import DashboardShell from "@/components/DashboardShell";

export default function SuperadminAnalyticsPage() {
  return (
    <DashboardShell
      role="superadmin"
      title="Analytics"
      subtitle="Complaint volume and resolution health"
      userName="Chief Admin"
      avatarUrl="/avatar-placeholder.svg"
    >
      <div className="rounded-2xl border border-dashed border-border bg-surface/70 p-10 text-center">
        <p className="text-base font-semibold text-heading">
          No analytical data available
        </p>
        <p className="mt-2 text-sm text-muted">
          Analytics will appear once enough complaints are recorded.
        </p>
      </div>
    </DashboardShell>
  );
}
