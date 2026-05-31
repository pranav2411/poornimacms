import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";

const admins = [
  // TODO: replace with API
  { id: "ADM-01", name: "Meera Singh", category: "Electrical" },
  { id: "ADM-02", name: "Harish Patel", category: "Plumbing" },
  { id: "ADM-03", name: "Zoya Khan", category: "IT/AV" },
];

export default function SuperadminAdminsPage() {
  return (
    <DashboardShell
      role="superadmin"
      title="Admin Management"
      subtitle="Assign categories and revoke access"
      userName="Chief Admin"
      avatarUrl="/avatar-placeholder.svg"
    >
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-heading">Admins</h2>
            <p className="text-sm text-muted">Manage category ownership.</p>
          </div>
          <Button
            type="button"
            className="border-primary bg-primary text-surface hover:bg-transparent hover:text-primary"
          >
            Add admin
          </Button>
        </div>
        <div className="mt-4 grid gap-3">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface/70 p-4"
            >
              <div>
                <p className="text-sm font-semibold text-heading">{admin.name}</p>
                <p className="text-xs text-muted">{admin.category}</p>
              </div>
              <Button
                type="button"
                size="sm"
                className="border-amber-500 bg-amber-500 text-surface hover:bg-transparent hover:text-amber-500"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </GlassCard>
    </DashboardShell>
  );
}
