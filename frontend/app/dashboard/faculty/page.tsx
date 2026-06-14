import DashboardShell from "@/components/DashboardShell";
import OpenComplaintsCarousel from "@/components/OpenComplaintsCarousel";
import { auth } from "@/auth";

export default async function FacultyDashboardPage() {
  const session = await auth();
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
      </div>
    </DashboardShell>
  );
}

