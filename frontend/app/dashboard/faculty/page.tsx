import DashboardShell from "@/components/DashboardShell";
import OpenComplaintsCarousel from "@/components/OpenComplaintsCarousel";
import { auth } from "@/auth";
import RefreshButton from "@/components/RefreshButton";

export default async function FacultyDashboardPage() {
  const session = await auth();
  return (
    <DashboardShell
      role="faculty"
      title="Faculty Dashboard"
      subtitle="Complaint pulse across your rooms"
      userName={session?.user?.name || "Faculty"}
      avatarUrl={session?.user?.image || "/user-no-av.png"}
      headerActions={<RefreshButton />}
    >
      <div className="grid gap-8">
        <OpenComplaintsCarousel />
      </div>
    </DashboardShell>
  );
}

