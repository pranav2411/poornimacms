import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";

const vendors = [
  // TODO: replace with API
  { id: "VND-01", name: "Ravi Electricals", category: "Electrical" },
  { id: "VND-02", name: "FlowFix Plumbing", category: "Plumbing" },
  { id: "VND-03", name: "TechWave AV", category: "IT/AV" },
];

export default function SuperadminVendorsPage() {
  return (
    <DashboardShell
      role="superadmin"
      title="Vendor Directory"
      subtitle="Track vendor coverage"
      userName="Chief Admin"
      avatarUrl="/user-no-av.png"
    >
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-heading">Vendors</h2>
            <p className="text-sm text-muted">Approved service partners.</p>
          </div>
          <Button
            type="button"
            className="border-primary bg-primary text-surface hover:bg-transparent hover:text-primary"
          >
            Add vendor
          </Button>
        </div>
        <div className="mt-4 grid gap-3">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface/70 p-4"
            >
              <div>
                <p className="text-sm font-semibold text-heading">{vendor.name}</p>
                <p className="text-xs text-muted">{vendor.category}</p>
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
