import { redirect } from "next/navigation";
import { auth } from "@/auth";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatsCharts from "@/components/StatsCharts";
import { getStats } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const session = await auth();

  // Validate authentication and admin authorization
  if (!session || !session.user) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  const departmentId = session.user.departmentId;

  // Fetch stats for this admin's department
  const statsResult = await getStats({ departmentId: departmentId || undefined });
  const stats = statsResult.stats || [];
  const avgResolutionTime = statsResult.avgResolutionTime;
  const hasAnalyticsData = stats.some((item) => item.value > 0);

  const activeCount = stats.find((s) => s.label === "Active Complaints")?.value || 0;
  const resolvedCount = stats.find((s) => s.label === "Resolved")?.value || 0;
  const totalComplaints = activeCount + resolvedCount;

  return (
    <DashboardShell
      role="admin"
      title="Department Analytics"
      subtitle="Department complaint volume and resolution health"
      userName={session.user.name || "Admin User"}
      avatarUrl={session.user.image || "/user-no-av.png"}
    >
      <div className="grid gap-6">
        {hasAnalyticsData && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <GlassCard className="p-6 flex flex-col justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Complaints</p>
              <h3 className="text-3xl font-bold text-heading mt-2">{totalComplaints}</h3>
            </GlassCard>
            <GlassCard className="p-6 flex flex-col justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Active Complaints</p>
              <h3 className="text-3xl font-bold text-blue-500 mt-2">{activeCount}</h3>
            </GlassCard>
            <GlassCard className="p-6 flex flex-col justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Resolved Complaints</p>
              <h3 className="text-3xl font-bold text-emerald-500 mt-2">{resolvedCount}</h3>
            </GlassCard>
            <GlassCard className="p-6 flex flex-col justify-between border-rose-500/20 bg-rose-500/[0.02]">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-500">Avg Resolution Time</p>
              <h3 className="text-3xl font-bold text-rose-500 mt-2">
                {avgResolutionTime && avgResolutionTime > 0 ? `${avgResolutionTime} hrs` : "N/A"}
              </h3>
            </GlassCard>
          </div>
        )}

        {hasAnalyticsData ? (
          <StatsCharts stats={stats} />
        ) : (
          <GlassCard className="p-10 text-center">
            <p className="text-base font-semibold text-heading">
              No analytical data available
            </p>
            <p className="mt-2 text-sm text-muted">
              Analytics will appear once complaints are filed for your department.
            </p>
          </GlassCard>
        )}
      </div>
    </DashboardShell>
  );
}
