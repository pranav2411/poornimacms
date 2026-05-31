"use client";

import { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import ComplaintTimeline from "@/components/ComplaintTimeline";
import AssignVendorModal from "@/components/AssignVendorModal";
import { Button } from "@/components/ui/button";
import { complaints, vendors } from "@/lib/mockData";

export default function AdminComplaintDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const complaint = complaints.find((item) => item.id === params.id) ?? complaints[0];
  const [open, setOpen] = useState(false);

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
                {complaint.id}
              </p>
              <h2 className="text-2xl font-semibold text-heading">
                {complaint.title}
              </h2>
            </div>
            <StatusPill status={complaint.status} />
          </div>
          <p className="mt-6 text-sm text-body/80">
            {complaint.description}
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
          <p className="text-xs text-muted">Updated at {complaint.updatedAt}</p>
          <div className="mt-4">
            <ComplaintTimeline activeStep={2} />
          </div>
        </GlassCard>
      </div>

      <AssignVendorModal
        open={open}
        onClose={() => setOpen(false)}
        vendors={vendors}
        onAssign={() => setOpen(false)}
      />
    </DashboardShell>
  );
}
