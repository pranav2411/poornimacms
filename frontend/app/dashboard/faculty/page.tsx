import DashboardShell from "@/components/DashboardShell";
import OpenComplaintsCarousel from "@/components/OpenComplaintsCarousel";
import StatsCharts from "@/components/StatsCharts";
import SosFloatingButton from "@/components/SosFloatingButton";
import { getStats } from "@/lib/api";

export default async function FacultyDashboardPage() {
  const facultyStats = await getStats();
  const hasAnalyticsData = facultyStats.some((item) => item.value > 0);
  return (
    <DashboardShell
      role="faculty"
      title="Faculty Dashboard"
      subtitle="Complaint pulse across your rooms"
      userName="Faculty"
      avatarUrl="/user-no-av.png"
    >
      <div className="grid gap-8">
        <OpenComplaintsCarousel />
        {hasAnalyticsData ? (
          <StatsCharts stats={facultyStats} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface/70 p-10 text-center">
            <p className="text-base font-semibold text-heading">
              No previous data available
            </p>
            <p className="mt-2 text-sm text-muted">
              Analytics will appear once complaints have been recorded.
            </p>
          </div>
        )}
      </div>
      <SosFloatingButton />
    </DashboardShell>
  );
}

