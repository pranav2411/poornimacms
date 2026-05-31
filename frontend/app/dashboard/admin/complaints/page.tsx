"use client";

import { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import AssignVendorModal from "@/components/AssignVendorModal";
import { Button } from "@/components/ui/button";
import { complaints, vendors } from "@/lib/mockData";

export default function AdminComplaintsPage() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(complaints[0]?.id ?? "");

  const handleAssign = () => {
    setOpen(false);
  };

  return (
    <DashboardShell
      role="admin"
      title="Complaints"
      subtitle="Assign vendors and track timelines"
      userName="Admin Desk"
      avatarUrl="/avatar-placeholder.svg"
    >
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-heading">Complaint list</h2>
            <p className="text-sm text-muted">Manage assignments by category.</p>
          </div>
          <Button
            type="button"
            onClick={() => setOpen(true)}
            className="border-primary bg-primary text-surface hover:bg-transparent hover:text-primary"
          >
            Assign vendor
          </Button>
        </div>
        <div className="mt-4 grid gap-3">
          {complaints.map((item) => (
            <Button
              key={item.id}
              type="button"
              onClick={() => setSelected(item.id)}
              className={`flex w-full flex-col items-start gap-3 border bg-surface text-left hover:bg-transparent hover:text-heading ${
                selected === item.id ? "border-accent/60" : "border-border"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-heading">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted">
                    {item.room} - {item.category}
                  </p>
                </div>
                <StatusPill status={item.status} />
              </div>
              <p className="text-xs text-muted">
                Assigned: {item.assignedTo ?? "Unassigned"}
              </p>
            </Button>
          ))}
        </div>
      </GlassCard>

      <AssignVendorModal
        open={open}
        onClose={() => setOpen(false)}
        vendors={vendors}
        onAssign={handleAssign}
      />
    </DashboardShell>
  );
}
