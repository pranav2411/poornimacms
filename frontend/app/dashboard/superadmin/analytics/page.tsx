import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardShell from "@/components/DashboardShell";
import { getStats } from "@/lib/api";
import SuperadminAnalyticsClient from "./SuperadminAnalyticsClient";

export const dynamic = "force-dynamic";

export default async function SuperadminAnalyticsPage() {
  const session = await auth();

  // Validate authentication and superadmin authorization
  if (!session || !session.user) {
    redirect("/login");
  }

  if (session.user.role !== "superadmin") {
    redirect("/unauthorized");
  }

  const supabase = createAdminClient();

  // Fetch departments, vendors and initial global stats concurrently
  const [deptsResult, vendorsResult, initialStats] = await Promise.all([
    supabase.from("departments").select("id, name").order("name", { ascending: true }),
    supabase.from("users").select("id, name").eq("role", "vendor").order("name", { ascending: true }),
    getStats(),
  ]);

  const departments = deptsResult.data || [];
  const vendors = vendorsResult.data || [];

  return (
    <DashboardShell
      role="superadmin"
      title="Global Analytics"
      subtitle="Institutional complaint volume and resolution health"
      userName={session.user.name || "Chief Admin"}
      avatarUrl={session.user.image || "/user-no-av.png"}
    >
      <SuperadminAnalyticsClient
        initialStatsResult={initialStats}
        departments={departments}
        vendors={vendors}
      />
    </DashboardShell>
  );
}
