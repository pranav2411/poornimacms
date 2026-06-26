"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import MarkFixedModal from "@/components/MarkFixedModal";
import RequestVendorChangeModal from "@/components/RequestVendorChangeModal";
import { getComplaint, markFixed, requestVendorChange } from "@/lib/api";
import type { Complaint } from "@/lib/types";

export default function VendorAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [changeModalOpen, setChangeModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadComplaint = async () => {
      try {
        const data = await getComplaint(id);
        if (isMounted) setComplaint(data);
      } catch {
        if (isMounted) setComplaint(null);
      }
    };

    loadComplaint();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleMarkFixedSubmit = async (remarks: string, image?: string) => {
    if (!complaint) return;
    try {
      await markFixed(complaint.id, remarks, image);
      router.push("/dashboard/vendor/assignments");
    } catch (err) {
      console.error(err);
      router.push("/dashboard/vendor/assignments");
    }
  };

  const handleRequestChangeSubmit = async (reason: string) => {
    if (!complaint) return;
    try {
      await requestVendorChange(complaint.id, reason);
      // Reload complaint to refresh UI state
      const data = await getComplaint(id);
      setComplaint(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardShell
      role="vendor"
      title="Assignment details"
      subtitle="Mark work as fixed and upload proof"
      userName={session?.user?.name || "Vendor"}
      avatarUrl={session?.user?.image || "/user-no-av.png"}
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
          <div className="mt-4 grid gap-3 text-sm text-body">
            <div className="flex items-center justify-between">
              <span className="text-muted">Room</span>
              <span className="font-mono text-heading">{complaint?.room ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Category</span>
              <span className="text-heading">{complaint?.category ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Reported by</span>
              <span className="text-heading font-semibold">{complaint?.createdByName || "Faculty User"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Priority</span>
              <span className="text-heading">{complaint?.priority ?? "-"}</span>
            </div>
          </div>
          <p className="mt-6 text-sm text-body/80 whitespace-pre-wrap">
            {complaint?.description ?? ""}
          </p>

          {complaint?.images && complaint.images.length > 0 && (
            <div className="mt-6 border-t border-border/50 pt-6">
              <h3 className="text-sm font-semibold text-heading mb-3">
                Attachments
              </h3>
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
        </GlassCard>

        <GlassCard className="p-6 h-fit">
          <p className="text-sm font-semibold text-heading">Repair actions</p>
          <p className="text-xs text-muted mb-4">Click below to resolve this assignment and provide comments/photos.</p>
          
          <Button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={!complaint || complaint.status === "Fixed"}
            className="w-full border-fixed bg-fixed text-surface hover:bg-transparent hover:text-fixed"
          >
            {complaint?.status === "Fixed" ? "Fixed (Pending Verification)" : "Mark as Fixed"}
          </Button>

          {complaint?.vendorChangeRequested ? (
            <div className="mt-3 text-center text-xs font-semibold text-pending bg-pending/10 p-2.5 rounded-xl border border-pending/20">
              Vendor change requested (Pending Admin)
            </div>
          ) : (
            <Button
              type="button"
              onClick={() => setChangeModalOpen(true)}
              disabled={!complaint || complaint.status === "Fixed" || complaint.status === "Closed"}
              className="mt-3 w-full border-pending bg-pending text-surface hover:bg-transparent hover:text-pending"
            >
              Request Vendor Change
            </Button>
          )}
        </GlassCard>
      </div>

      <MarkFixedModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleMarkFixedSubmit}
      />

      <RequestVendorChangeModal
        open={changeModalOpen}
        onClose={() => setChangeModalOpen(false)}
        onSubmit={handleRequestChangeSubmit}
      />
    </DashboardShell>
  );
}
