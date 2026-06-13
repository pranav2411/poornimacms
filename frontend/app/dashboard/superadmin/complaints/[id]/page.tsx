"use client";

import { Suspense, useEffect, useState, use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import ComplaintTimeline from "@/components/ComplaintTimeline";
import AssignVendorModal from "@/components/AssignVendorModal";
import CloseComplaintModal from "@/components/CloseComplaintModal";
import { Button } from "@/components/ui/button";
import { assignVendor, getComplaint, getVendors, closeComplaint, deleteComplaint } from "@/lib/api";
import { useConfirm } from "@/lib/confirm-context";
import { useToast } from "@/lib/toast";
import type { Complaint, VendorItem } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

function SuperadminComplaintDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const confirm = useConfirm();
  const { addToast } = useToast();
  const shouldAutoAssign = searchParams.get("assign") === "true";

  const [open, setOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [complaintData, vendorsData] = await Promise.all([
          getComplaint(id),
          getVendors(),
        ]);
        if (!isMounted) return;
        setComplaint(complaintData);
        setVendors(vendorsData);

        if (shouldAutoAssign && complaintData.status !== "Closed") {
          setOpen(true);
        }
      } catch (err) {
        console.error("Error loading complaint details:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [id, shouldAutoAssign]);

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

  const handleCloseWithReason = async (reason: string) => {
    if (!complaint) return;
    setClosing(true);
    try {
      const updated = await closeComplaint(complaint.id, reason);
      setComplaint(updated);
      setCloseModalOpen(false);
    } catch (err) {
      console.error("Error closing complaint:", err);
    } finally {
      setClosing(false);
    }
  };

  const handleDelete = async () => {
    if (!complaint) return;
    const confirmed = await confirm({
      title: "Delete Complaint",
      description: "Are you sure you want to delete this complaint permanently? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
    });
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deleteComplaint(complaint.id);
      addToast({
        title: "Complaint Deleted",
        description: `Complaint ${complaint.id} has been permanently deleted.`,
        variant: "default",
      });
      router.push("/dashboard/superadmin/complaints");
    } catch (err) {
      console.error("Error deleting complaint:", err);
      addToast({
        title: "Failed to Delete",
        description: err instanceof Error ? err.message : "An error occurred.",
        variant: "destructive",
      });
      setDeleting(false);
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted font-medium animate-pulse">Loading complaint details...</div>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-destructive font-medium">Complaint not found.</div>
      </div>
    );
  }

  const isClosed = getActiveStep(complaint.status) >= 4;

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <GlassCard className="p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="mt-6 border-b border-border/50 pb-6">
          <h3 className="text-sm font-semibold text-heading mb-2">Description</h3>
          <p className="text-sm text-body/90 whitespace-pre-wrap">
            {complaint.description || "No description provided."}
          </p>
        </div>

        {complaint.closeReason && (
          <div className="mt-6 border-b border-border/50 pb-6">
            <h3 className="text-sm font-semibold text-heading mb-2">Close Reason</h3>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
              <p className="text-sm text-amber-700 font-medium">
                {complaint.closeReason}
              </p>
            </div>
          </div>
        )}

        {complaint.images && complaint.images.length > 0 && (
          <div className="mt-6 border-b border-border/50 pb-6">
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

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-full border border-red-500 bg-red-500 text-white hover:bg-transparent hover:text-red-500 text-xs font-semibold py-2.5 px-6 shadow-sm transition-all duration-200 cursor-pointer"
          >
            {deleting ? "Deleting..." : "Delete Complaint"}
          </Button>

          {!isClosed && (
            <>
              <Button
                type="button"
                onClick={() => setCloseModalOpen(true)}
                disabled={closing}
                className="rounded-full border border-amber-500 bg-amber-500 text-white hover:bg-transparent hover:text-amber-500 text-xs font-semibold py-2.5 px-6 shadow-sm transition-all duration-200 cursor-pointer"
              >
                Close Complaint
              </Button>
              <Button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-full border border-primary bg-primary text-white hover:bg-transparent hover:text-primary text-xs font-semibold py-2.5 px-6 shadow-sm transition-all duration-200 cursor-pointer"
              >
                Assign Vendor
              </Button>
            </>
          )}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-sm font-semibold text-heading">Status timeline</h3>
        <p className="text-xs text-muted">
          Updated at {formatDateTime(complaint.updatedAt)}
        </p>
        <div className="mt-4">
          <ComplaintTimeline
            activeStep={getActiveStep(complaint.status)}
            isClosedDirectly={complaint.status === "Closed" && !complaint.assignedTo}
          />
        </div>
      </GlassCard>

      <AssignVendorModal
        open={open}
        onClose={() => setOpen(false)}
        vendors={vendors.map((item) => item.name)}
        onAssign={handleAssign}
      />

      <CloseComplaintModal
        open={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        onCloseSubmit={handleCloseWithReason}
      />
    </div>
  );
}

export default function SuperadminComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <DashboardShell
      role="superadmin"
      title="Complaint Detail"
      subtitle="System-wide timeline and vendor dispatch"
      userName="Chief Admin"
      avatarUrl="/user-no-av.png"
    >
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center">
            <div className="text-muted font-medium animate-pulse">Loading complaint details...</div>
          </div>
        }
      >
        <SuperadminComplaintDetailContent params={params} />
      </Suspense>
    </DashboardShell>
  );
}
