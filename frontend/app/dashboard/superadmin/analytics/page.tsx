import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";

const barData = [
  { label: "Electrical", value: 28, color: "var(--color-assigned)" },
  { label: "Plumbing", value: 22, color: "var(--color-pending)" },
  { label: "Carpentry", value: 14, color: "var(--color-fixed)" },
  { label: "IT/AV", value: 18, color: "var(--color-accent)" },
  { label: "Housekeeping", value: 10, color: "var(--color-closed)" },
];

export default function SuperadminAnalyticsPage() {
  const max = Math.max(...barData.map((item) => item.value));

  return (
    <DashboardShell
      role="superadmin"
      title="Analytics"
      subtitle="Complaint volume and resolution health"
      userName="Chief Admin"
      avatarUrl="/avatar-placeholder.svg"
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-heading">
            Complaints by category
          </h2>
          <p className="text-sm text-muted">
            Current month distribution.
          </p>
          <div className="mt-6 grid gap-4">
            {barData.map((item) => (
              <div key={item.label} className="grid gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-heading">{item.label}</span>
                  <span className="text-muted">{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-border/70">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${(item.value / max) * 100}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <div className="grid gap-6">
          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold text-heading">Resolution time</h3>
            <p className="mt-3 text-3xl font-semibold text-heading">1.8 days</p>
            <p className="text-sm text-muted">Average close time</p>
          </GlassCard>
          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold text-heading">Open vs Closed</h3>
            <div className="mt-4 flex items-center gap-4">
              <div
                className="h-24 w-24 rounded-full"
                style={{
                  background:
                    "conic-gradient(var(--color-accent) 0% 65%, var(--color-closed) 65% 100%)",
                }}
              />
              <div className="text-sm text-body">
                <p className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  Open 65%
                </p>
                <p className="mt-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-closed" />
                  Closed 35%
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </DashboardShell>
  );
}
