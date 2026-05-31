import DashboardShell from "@/components/DashboardShell";
import OpenComplaintsCarousel from "@/components/OpenComplaintsCarousel";
import StatsCharts from "@/components/StatsCharts";
import { Button } from "@/components/ui/button";
import { getStats } from "@/lib/api";
import Link from "next/link";

export default async function FacultyDashboardPage() {
  const facultyStats = await getStats();
  const hasAnalyticsData = facultyStats.some((item) => item.value > 0);
  return (
    <DashboardShell
      role="faculty"
      title="Faculty Dashboard"
      subtitle="Complaint pulse across your rooms"
      userName="Dr. Aditi Sharma"
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
      <Button
        asChild
        size="icon-lg"
        className="fixed bottom-5 right-5 z-30 rounded-full border-accent bg-accent text-surface shadow-lg hover:bg-transparent hover:text-accent sm:bottom-8 sm:right-8"
      >
        <Link href="/complaints/new" aria-label="File a new complaint">
          +
        </Link>
      </Button>
    </DashboardShell>
  );
}
