import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSosHistory, type SosAlertHistoryItem } from "@/lib/api";
import DashboardShell from "@/components/DashboardShell";
import SosHistoryClient from "../../superadmin/sos/SosHistoryClient";

export const dynamic = "force-dynamic";

export default async function VendorSosHistoryPage() {
  const session = await auth();

  // Protect route
  if (!session || !session.user) {
    redirect("/login");
  }

  if (session.user.role !== "vendor" && session.user.role !== "superadmin") {
    redirect("/unauthorized");
  }

  let alerts: SosAlertHistoryItem[] = [];
  try {
    const allAlerts = await getSosHistory();
    alerts = allAlerts.filter((a) => a.status === "active");
  } catch (err) {
    console.error("Error loading SOS alerts on vendor page:", err);
  }

  return (
    <DashboardShell
      role="vendor"
      title="Active SOS Alerts"
      subtitle="Currently active campus emergency panic events"
      userName={session.user.name || "Vendor Desk"}
      avatarUrl={session.user.image || "/user-no-av.png"}
    >
      <SosHistoryClient initialAlerts={alerts} />
    </DashboardShell>
  );
}
