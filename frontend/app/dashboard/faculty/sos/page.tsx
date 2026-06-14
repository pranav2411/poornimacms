import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSosHistory, type SosAlertHistoryItem } from "@/lib/api";
import DashboardShell from "@/components/DashboardShell";
import SosHistoryClient from "../../superadmin/sos/SosHistoryClient";

export const dynamic = "force-dynamic";

export default async function FacultySosHistoryPage() {
  const session = await auth();

  // Protect route
  if (!session || !session.user) {
    redirect("/login");
  }

  if (session.user.role !== "faculty") {
    redirect("/unauthorized");
  }

  let alerts: SosAlertHistoryItem[] = [];
  try {
    // Only pass active alerts to faculty since they only need to see active alerts about the SOS
    const allAlerts = await getSosHistory();
    alerts = allAlerts.filter((a) => a.status === "active");
  } catch (err) {
    console.error("Error loading SOS alerts on faculty page:", err);
  }

  return (
    <DashboardShell
      role="faculty"
      title="Active SOS Alerts"
      subtitle="Currently active campus emergency panic events"
      userName={session.user.name || "Faculty Desk"}
      avatarUrl={session.user.image || "/user-no-av.png"}
    >
      <SosHistoryClient initialAlerts={alerts} />
    </DashboardShell>
  );
}
