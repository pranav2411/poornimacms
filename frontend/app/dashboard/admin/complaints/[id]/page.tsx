"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import ComplaintTimeline from "@/components/ComplaintTimeline";
import AssignVendorModal from "@/components/AssignVendorModal";
import { Button } from "@/components/ui/button";
import { assignVendor, getComplaint, getVendors } from "@/lib/api";
import type { Complaint, VendorItem } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function AdminComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [vendors, setVendors] = useState<VendorItem[]>([]);

  const isSuperadmin = session?.user?.role === "superadmin";
  const adminDeptId = isSuperadmin ? undefined : (session?.user?.departmentId || undefined);

  useEffect(() => {
    if (session === undefined) return;
    let isMounted = true;

    const loadData = async () => {
      try {
        const [complaintData, vendorsData] = await Promise.all([
          getComplaint(id),
          getVendors({ departmentId: adminDeptId }),
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
  }, [id, session, adminDeptId]);

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
  const getActiveStep = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "open":
      case "pending":
        return 0;
      case "vendor_assigned":
      case "assigned":
        return 1;
      case "in_progress":
        return 2;
      case "done":
      case "fixed":
        return 3;
      case "resolved":
      case "closed":
      case "cancelled":
        return 4;
      default:
        return 0;
    }
  };

  return (
    <DashboardShell
      role="admin"
      title="Complaint Details"
      subtitle="Assign vendors and monitor status"
      userName={session?.user?.name || "Admin Desk"}
      avatarUrl={session?.user?.image || "/avatar-placeholder.svg"}
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <GlassCard className="p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

          {complaint && (
            <div className="mt-6 grid gap-3 text-sm text-body border-b border-border/50 pb-6">
              <div className="flex items-center justify-between">
                <span className="text-muted">Room</span>
                <span className="font-mono text-heading">{complaint.room}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Category / Department</span>
                <span className="text-heading font-medium">{complaint.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Made by</span>
                <span className="text-heading font-semibold">{complaint.createdByName || "Faculty User"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Assigned vendor</span>
                <span className="text-heading">{complaint.assignedTo ?? "Unassigned"}</span>
              </div>
            </div>
          )}

          <div className="mt-6 border-b border-border/50 pb-6">
            <h3 className="text-sm font-semibold text-heading mb-2">Description</h3>
            <p className="text-sm text-body/90 whitespace-pre-wrap">
              {complaint?.description ?? ""}
            </p>
          </div>
          {complaint?.images && complaint.images.length > 0 && (
            <div className="mt-6 border-t border-border/50 pt-6">
              <h3 className="text-sm font-semibold text-heading mb-3">Attachments</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {complaint.images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="relative h-48 overflow-hidden rounded-xl border border-border bg-muted/30"
                  >
                    <img
                      src={imgUrl}
                      alt={`Attachment ${idx + 1}`}
                      className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
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
          <p className="text-xs text-muted">Updated at {complaint?.updatedAt ? formatDateTime(complaint.updatedAt) : "-"}</p>
          <div className="mt-4">
            <ComplaintTimeline
              activeStep={complaint ? getActiveStep(complaint.status) : 0}
              isClosedDirectly={complaint ? complaint.status === "Closed" && !complaint.assignedTo : false}
            />
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
