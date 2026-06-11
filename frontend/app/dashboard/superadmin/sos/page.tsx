import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSosHistory, type SosAlertHistoryItem } from "@/lib/api";
import DashboardShell from "@/components/DashboardShell";
import SosHistoryClient from "./SosHistoryClient";

export const dynamic = "force-dynamic";

export default async function SuperadminSosHistoryPage() {
  const session = await auth();

  // Protect route
  if (!session || !session.user) {
    redirect("/login");
  }

  if (session.user.role !== "superadmin") {
    redirect("/unauthorized");
  }

  let alerts: SosAlertHistoryItem[] = [];
  try {
    alerts = await getSosHistory();
  } catch (err) {
    console.error("Error loading SOS history on server:", err);
  }

  return (
    <DashboardShell
      role="superadmin"
      title="Emergency SOS Alerts"
      subtitle="History of triggered campus panic events"
      userName={session.user.name || "Chief Admin"}
      avatarUrl={session.user.image || "/user-no-av.png"}
    >
      <SosHistoryClient initialAlerts={alerts} />
    </DashboardShell>
  );
}
