"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import ComplaintTimeline from "@/components/ComplaintTimeline";
import AssignVendorModal from "@/components/AssignVendorModal";
import { Button } from "@/components/ui/button";
import { assignVendor, getComplaint, getVendors, markFixed } from "@/lib/api";
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
  const [isAssigning, setIsAssigning] = useState(false);

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

  const handleAssign = async (vendor: VendorItem) => {
    if (!complaint) return;
    setIsAssigning(true);
    try {
      const updated = await assignVendor(complaint.id, vendor.name);
      setComplaint(updated);
      setOpen(false);
    } catch {
      setOpen(false);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleMarkFixed = async () => {
    if (!complaint) return;
    try {
      const updated = await markFixed(complaint.id, "Marked as fixed by Admin");
      setComplaint(updated);
    } catch (error) {
      console.error(error);
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
          </div>

          {complaint?.vendorChangeRequested && (
            <div className="mt-4 rounded-2xl border border-pending/30 bg-pending/10 p-4 text-sm text-heading animate-pulse">
              <p className="font-semibold text-pending">
                Vendor Reassignment Requested
              </p>
              <p className="mt-1 text-xs text-muted">
                Reason: "{complaint.vendorChangeReason}"
              </p>
              <div className="mt-3">
                <Button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="border-pending bg-pending text-surface hover:bg-transparent hover:text-pending"
                >
                  Change Vendor
                </Button>
              </div>
            </div>
          )}

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
          {/* Vendor Resolution Proof and Updates */}
          {complaint && (complaint.status === "Fixed" || complaint.status === "Closed" || (complaint.fixImages && complaint.fixImages.length > 0)) && (
            <div className="mt-6 border-t border-border/50 pt-6">
              <h3 className="text-sm font-semibold text-heading mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-fixed animate-pulse" />
                Vendor Updates & Resolution Proof
              </h3>
              
              {(() => {
                const fixTimelineItem = complaint.timeline?.find(
                  (item) => item.label?.toLowerCase() === "done" || item.label?.toLowerCase() === "fixed"
                );
                const remarks = fixTimelineItem?.remarks || (complaint.status === "Fixed" ? "Work marked as completed by vendor." : null);
                return remarks ? (
                  <div className="mb-4 rounded-xl border border-border/80 bg-surface/40 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Vendor Remarks</p>
                    <p className="text-sm text-body italic font-medium">"{remarks}"</p>
                  </div>
                ) : null;
              })()}

              {complaint.fixImages && complaint.fixImages.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Fix Proof Images</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {complaint.fixImages.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className="relative h-48 overflow-hidden rounded-xl border border-border bg-muted/30 shadow-sm"
                      >
                        <img
                          src={imgUrl}
                          alt={`Resolution Proof ${idx + 1}`}
                          className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted italic">No proof images uploaded by vendor.</p>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {complaint && complaint.status !== "Fixed" && complaint.status !== "Closed" && (
              <Button
                type="button"
                onClick={() => setOpen(true)}
                className="border-primary bg-primary text-surface hover:bg-transparent hover:text-primary"
              >
                Assign vendor
              </Button>
            )}
            {complaint && complaint.assignedTo && complaint.status !== "Fixed" && complaint.status !== "Closed" && (
              <Button
                type="button"
                onClick={handleMarkFixed}
                className="border-fixed bg-fixed text-surface hover:bg-transparent hover:text-fixed"
              >
                Mark as Fixed
              </Button>
            )}
          </div>
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

          <div className="mt-8 border-t border-border/50 pt-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-heading mb-3">Status Logs</h4>
            <div className="space-y-3">
              {complaint?.timeline && complaint.timeline.length > 0 ? (
                complaint.timeline.map((step, idx) => (
                  <div key={idx} className="flex gap-3 text-xs leading-relaxed">
                    <div className="w-[60px] shrink-0 text-muted font-mono text-[10px]">
                      {formatDateTime(step.time).split(" ")[0]}
                    </div>
                    <div>
                      <span className="font-semibold text-heading">{step.label}</span>
                      {step.remarks && (
                        <p className="text-muted mt-0.5 text-[11px] italic bg-muted/20 px-2 py-1 rounded-md">
                          {step.remarks}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted italic">No logs available.</p>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      <AssignVendorModal
        open={open}
        onClose={() => setOpen(false)}
        vendors={vendors}
        onAssign={handleAssign}
        isLoading={isAssigning}
      />
    </DashboardShell>
  );
}
