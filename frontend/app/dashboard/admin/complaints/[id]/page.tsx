"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import ComplaintTimeline from "@/components/ComplaintTimeline";
import AssignVendorModal from "@/components/AssignVendorModal";
import { Button } from "@/components/ui/button";
import { assignVendor, getComplaint, getVendors } from "@/lib/api";
import type { Complaint, VendorItem } from "@/lib/types";

export default function AdminComplaintDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [open, setOpen] = useState(false);
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [vendors, setVendors] = useState<VendorItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [complaintData, vendorsData] = await Promise.all([
          getComplaint(params.id),
          getVendors(),
        ]);
        if (!isMounted) return;
        setComplaint(complaintData);
        setVendors(vendorsData);
      } catch {
        if (!isMounted) return;
        setComplaint(null);
        setVendors([]);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [params.id]);

  const handleAssign = async (vendor: string) => {
    if (!complaint) return;
    try {
      const updated = await assignVendor(complaint.id, vendor);
      setComplaint(updated);
      setOpen(false);
    } catch {
      setOpen(false);
    }
  };

  return (
    <DashboardShell
      role="admin"
      title="Complaint Details"
      subtitle="Assign vendors and monitor status"
      userName="Admin Desk"
      avatarUrl="/avatar-placeholder.svg"
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                {complaint?.id ?? "-"}
              </p>
              <h2 className="text-2xl font-semibold text-heading">
                {complaint?.title ?? "Loading..."}
              </h2>
            </div>
            {complaint ? <StatusPill status={complaint.status} /> : null}
          </div>
          <p className="mt-6 text-sm text-body/80">
            {complaint?.description ?? ""}
          </p>
          <Button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-6 border-primary bg-primary text-surface hover:bg-transparent hover:text-primary"
          >
            Assign vendor
          </Button>
        </GlassCard>
        <GlassCard className="p-6">
          <h3 className="text-sm font-semibold text-heading">Status timeline</h3>
          <p className="text-xs text-muted">Updated at {complaint?.updatedAt ?? "-"}</p>
          <div className="mt-4">
            <ComplaintTimeline activeStep={2} />
          </div>
        </GlassCard>
      </div>

      <AssignVendorModal
        open={open}
        onClose={() => setOpen(false)}
        vendors={vendors.map((item) => item.name)}
        onAssign={handleAssign}
      />
    </DashboardShell>
  );
}
