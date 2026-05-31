import DashboardShell from "@/components/DashboardShell";
import OpenComplaintsCarousel from "@/components/OpenComplaintsCarousel";
import StatsCharts from "@/components/StatsCharts";
import { Button } from "@/components/ui/button";
import { getStats } from "@/lib/api";

export default async function FacultyDashboardPage() {
  const facultyStats = await getStats();
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

        <StatsCharts stats={facultyStats} />
      </div>
      <Button
        type="button"
        size="icon-lg"
        className="fixed bottom-8 right-8 z-30 rounded-full border-accent bg-accent text-surface shadow-lg hover:bg-transparent hover:text-accent"
      >
        +
      </Button>
    </DashboardShell>
  );
}
