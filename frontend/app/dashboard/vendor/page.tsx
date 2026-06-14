import DashboardShell from "@/components/DashboardShell";
import OpenComplaintsCarousel from "@/components/OpenComplaintsCarousel";
import { auth } from "@/auth";

export default async function VendorDashboardPage() {
  const session = await auth();

  return (
    <DashboardShell
      role="vendor"
      title="Vendor Dashboard"
      subtitle="Assigned repairs and next steps"
      userName={session?.user?.name || "Vendor"}
      avatarUrl={session?.user?.image || "/user-no-av.png"}
    >
      <div className="grid gap-8">
        <OpenComplaintsCarousel />
      </div>
    </DashboardShell>
  );
}
