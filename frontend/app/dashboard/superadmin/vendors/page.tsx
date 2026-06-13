import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardShell from "@/components/DashboardShell";
import VendorsDirectoryClient from "./VendorsDirectoryClient";

export const dynamic = "force-dynamic";

export default async function SuperadminVendorsPage() {
  const session = await auth();

  // Validate authentication and superadmin authorization
  if (!session || !session.user) {
    redirect("/login");
  }

  if (session.user.role !== "superadmin") {
    redirect("/unauthorized");
  }

  const supabase = createAdminClient();

  // Query vendors from database
  const { data: dbVendors, error } = await supabase
    .from("users")
    .select(`
      id,
      name,
      email,
      avatar_url,
      departments (
        name
      )
    `)
    .eq("role", "vendor")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching vendors list:", error);
  }

  // Format vendor data
  const formattedVendors = (dbVendors || []).map((vendor) => {
    const categoryName = (vendor.departments as any)?.name || "General";
    return {
      id: vendor.id,
      name: vendor.name || vendor.email.split("@")[0],
      email: vendor.email,
      image: vendor.avatar_url || null,
      category: categoryName,
    };
  });

  return (
    <DashboardShell
      role="superadmin"
      title="Vendor Directory"
      subtitle="Track vendor coverage"
      userName={session.user.name || "Chief Admin"}
      avatarUrl={session.user.image || "/user-no-av.png"}
    >
      <VendorsDirectoryClient initialVendors={formattedVendors} />
    </DashboardShell>
  );
}
