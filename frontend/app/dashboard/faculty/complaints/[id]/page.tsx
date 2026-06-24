"use client";

import { Suspense, useEffect, useState, use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import ComplaintTimeline from "@/components/ComplaintTimeline";
import CloseComplaintModal from "@/components/CloseComplaintModal";
import EditComplaintModal from "@/components/EditComplaintModal";
import { Button } from "@/components/ui/button";
import {
  getComplaint,
  closeComplaint,
  sendReminder,
  reportIssue,
  verifySolution,
  notifyVendor,
  updateComplaint,
} from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { Complaint } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// SVG Icons for clean, library-free visual accents
function MapPinIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

function TagIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.125 1.125 0 0 0 1.591 0l4.318-4.318a1.125 1.125 0 0 0 0-1.591L9.568 3.659A2.25 2.25 0 0 0 9.568 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
    </svg>
  );
}

function UserIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function ShieldAlertIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
  );
}

function CalendarIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  );
}

function FacultyComplaintDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const { addToast } = useToast();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Report Incomplete Work States
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportForm, setReportForm] = useState({
    reason: "Work was not completed",
    details: "",
  });

  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const complaintData = await getComplaint(id);
        if (!isMounted) return;

        // Security check: ensure faculty only accesses their own complaints
        if (session?.user?.id && complaintData.createdBy !== session.user.id) {
          router.replace("/dashboard/faculty");
          return;
        }

        setComplaint(complaintData);
      } catch (err) {
        console.error("Error loading complaint details:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (session !== undefined) {
      loadData();
    }
    return () => {
      isMounted = false;
    };
  }, [id, session, router]);

  // Countdown timer for reminding vendor
  useEffect(() => {
    if (!complaint?.lastReminderSent) return;

    const updateTimer = () => {
      const lastReminderTime = new Date(complaint.lastReminderSent!).getTime();
      const now = new Date().getTime();
      const msRemaining = 24 * 60 * 60 * 1000 - (now - lastReminderTime);

      if (msRemaining > 0) {
        const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
        const minutesRemaining = Math.floor(
          (msRemaining % (1000 * 60 * 60)) / (1000 * 60)
        );

        if (hoursRemaining > 0) {
          setTimeRemaining(`${hoursRemaining}h`);
        } else {
          setTimeRemaining(`${minutesRemaining}m`);
        }
      } else {
        setTimeRemaining("");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [complaint?.lastReminderSent]);

  const canSendReminder = (lastReminderSent?: string): boolean => {
    if (!lastReminderSent) return true;
    const lastReminderTime = new Date(lastReminderSent).getTime();
    const now = new Date().getTime();
    const hoursPassed = (now - lastReminderTime) / (1000 * 60 * 60);
    return hoursPassed >= 24;
  };

  const handleCloseWithReason = async (reason: string) => {
    if (!complaint) return;
    setClosing(true);
    try {
      const updated = await closeComplaint(complaint.id, reason);
      setComplaint(updated);
      setCloseModalOpen(false);
      addToast({
        title: "Success",
        description: `Complaint ${complaint.id} has been closed`,
      });
    } catch (err) {
      console.error("Error closing complaint:", err);
      addToast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to close complaint",
        variant: "destructive",
      });
    } finally {
      setClosing(false);
    }
  };

  const handleEditSubmit = async (payload: {
    title: string;
    description: string;
    location: string;
    priority: string;
  }) => {
    if (!complaint) return;
    try {
      const updated = await updateComplaint(complaint.id, payload);
      setComplaint(updated);
      addToast({
        title: "Complaint Updated",
        description: `Complaint ${complaint.id} details have been successfully updated.`,
      });
    } catch (error) {
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update complaint",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleRemindVendor = async () => {
    if (!complaint) return;
    try {
      const updated = await sendReminder(complaint.id);
      setComplaint(updated);
      addToast({
        title: "Reminder Sent",
        description: `Reminder sent to ${complaint.assignedTo}`,
      });
    } catch (error) {
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send reminder",
        variant: "destructive",
      });
    }
  };

  const handleVerifySolution = async () => {
    if (!complaint) return;
    try {
      const updated = await verifySolution(complaint.id);
      setComplaint(updated);
      addToast({
        title: "Solution Verified",
        description: `Complaint ${complaint.id} has been marked resolved.`,
      });
    } catch (error) {
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify solution",
        variant: "destructive",
      });
    }
  };

  const handleNotifyVendor = async () => {
    if (!complaint) return;
    try {
      await notifyVendor(complaint.id);
      addToast({
        title: "Vendor Notified",
        description: `Vendor ${complaint.assignedTo} has been notified that this complaint is pending.`,
      });
    } catch (error) {
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to notify vendor",
        variant: "destructive",
      });
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint) return;
    try {
      await reportIssue(complaint.id, reportForm.reason, reportForm.details);
      addToast({
        title: "Report Submitted",
        description: `Report sent to superadmin for ${complaint.id}`,
      });
      const updated = await getComplaint(complaint.id);
      setComplaint(updated);
      setReportModalOpen(false);
      setReportForm({ reason: "Work was not completed", details: "" });
    } catch (error) {
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit report",
        variant: "destructive",
      });
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
        <div className="text-muted font-medium animate-pulse">
          Loading complaint details...
        </div>
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
  const isPendingOrOpen = complaint.status === "Open" || complaint.status === "Pending";

  // Find vendor remarks/notes from timeline
  const resolutionStep = complaint.timeline?.find(
    (t) => t.label?.toLowerCase() === "done" || t.label?.toLowerCase() === "fixed"
  );
  const resolutionNote = resolutionStep?.remarks || "Work marked completed by vendor.";
  const resolutionTime = resolutionStep?.time ? formatDateTime(resolutionStep.time) : null;

  return (
    <div className="space-y-6">
      {/* Back to list and ID header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <button
          onClick={() => router.push("/dashboard/faculty")}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-heading transition-colors"
        >
          <ArrowLeftIcon /> Back to Complaints
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-surface/50 border border-border px-2.5 py-1 rounded-md text-muted">
            {complaint.id}
          </span>
          <StatusPill status={complaint.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {/* Main Info Card */}
          <GlassCard className="p-6 md:p-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold text-heading tracking-tight">
                  {complaint.title}
                </h2>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Reported on {formatDateTime(complaint.createdAt)}</span>
                </div>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/40">
                <div className="rounded-2xl border border-border/40 bg-surface/30 p-4 transition-all hover:bg-surface/50">
                  <div className="flex items-center gap-2 text-muted mb-1">
                    <MapPinIcon className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium uppercase tracking-wider">Room</span>
                  </div>
                  <span className="text-base font-semibold font-mono text-heading">{complaint.room}</span>
                </div>

                <div className="rounded-2xl border border-border/40 bg-surface/30 p-4 transition-all hover:bg-surface/50">
                  <div className="flex items-center gap-2 text-muted mb-1">
                    <TagIcon className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-medium uppercase tracking-wider">Category</span>
                  </div>
                  <span className="text-base font-semibold text-heading truncate block">{complaint.category || "General"}</span>
                </div>

                <div className="rounded-2xl border border-border/40 bg-surface/30 p-4 transition-all hover:bg-surface/50">
                  <div className="flex items-center gap-2 text-muted mb-1">
                    <UserIcon className="h-4 w-4 text-sky-500" />
                    <span className="text-xs font-medium uppercase tracking-wider">Vendor</span>
                  </div>
                  <span className="text-base font-semibold text-heading truncate block">
                    {complaint.assignedTo ?? "Unassigned"}
                  </span>
                </div>

                <div className="rounded-2xl border border-border/40 bg-surface/30 p-4 transition-all hover:bg-surface/50">
                  <div className="flex items-center gap-2 text-muted mb-1">
                    <ShieldAlertIcon className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-medium uppercase tracking-wider">Priority</span>
                  </div>
                  <span className="text-base font-semibold text-heading block">
                    {complaint.priority}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-2">Description</h3>
                <div className="rounded-2xl border border-border/30 bg-surface/25 p-5">
                  <p className="text-sm text-body/90 leading-relaxed whitespace-pre-wrap">
                    {complaint.description || "No description provided."}
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Resolution Card: Appears only when vendor marks done, is fixed, closed, or verified */}
          {(complaint.status === "Fixed" || complaint.status === "Closed" || resolutionStep) && (
            <GlassCard className="p-6 md:p-8 border-l-4 border-l-emerald-500/80">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-heading flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 text-sm">✓</span>
                      Vendor Resolution Details
                    </h3>
                    {resolutionTime && (
                      <p className="text-xs text-muted">Submitted on {resolutionTime}</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700/80 block mb-1">Vendor's Completion Note</span>
                  <p className="text-sm text-heading italic font-medium leading-relaxed">
                    "{resolutionNote}"
                  </p>
                </div>

                {complaint.fixImages && complaint.fixImages.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted block">Resolution Completion Photos</span>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {complaint.fixImages.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          className="group relative h-40 overflow-hidden rounded-2xl border border-border bg-muted/20"
                        >
                          <img
                            src={imgUrl}
                            alt={`Resolution Photo ${idx + 1}`}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          {/* Initial Attachments */}
          {complaint.images && complaint.images.length > 0 && (
            <GlassCard className="p-6 md:p-8">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
                  Initial Complaint Attachments ({complaint.images.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {complaint.images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="group relative h-40 overflow-hidden rounded-2xl border border-border bg-muted/20"
                    >
                      <img
                        src={imgUrl}
                        alt={`Attachment ${idx + 1}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}

          {/* Cancellation Detail */}
          {complaint.closeReason && (
            <GlassCard className="p-6 border-l-4 border-l-red-500/80">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-heading uppercase tracking-wider">
                  Cancellation Reason
                </h3>
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                  <p className="text-sm text-red-700 font-medium italic">
                    "{complaint.closeReason}"
                  </p>
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Sidebar: Status Timeline & Action Buttons */}
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold text-heading uppercase tracking-wider mb-1">Status Timeline</h3>
            <p className="text-xs text-muted mb-6">
              Last updated at {formatDateTime(complaint.updatedAt)}
            </p>
            <div>
              <ComplaintTimeline
                activeStep={getActiveStep(complaint.status)}
                isClosedDirectly={
                  complaint.status === "Closed" && !complaint.assignedTo
                }
              />
            </div>
          </GlassCard>

          {/* Action Panel */}
          <GlassCard className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-heading uppercase tracking-wider mb-2">Actions</h3>

            <div className="flex flex-col gap-3">
              {/* Verify Button: for Fixed status */}
              {complaint.status === "Fixed" && (
                <Button
                  type="button"
                  onClick={handleVerifySolution}
                  className="w-full rounded-full border border-purple-500 text-purple-500 bg-transparent hover:bg-purple-500 hover:text-white text-xs font-semibold py-3 px-6 shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  Mark as Complete
                </Button>
              )}

              {/* Close Complaint Button: for Open/Pending status with no vendor assigned */}
              {!isClosed && isPendingOrOpen && !complaint.assignedTo && (
                <Button
                  type="button"
                  onClick={() => setCloseModalOpen(true)}
                  disabled={closing}
                  className="w-full rounded-full border border-red-500 text-red-500 bg-transparent hover:bg-red-500 hover:text-white text-xs font-semibold py-3 px-6 shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  Cancel Complaint
                </Button>
              )}

              {/* Edit Complaint Button: visible only while it's open/pending and not assigned to any vendor */}
              {(complaint.status?.toLowerCase() === "open" || complaint.status?.toLowerCase() === "pending") && !complaint.assignedTo && (
                <Button
                  type="button"
                  onClick={() => setEditModalOpen(true)}
                  className="w-full rounded-full border border-primary text-primary bg-transparent hover:bg-primary hover:text-white text-xs font-semibold py-3 px-6 shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                  Edit Complaint
                </Button>
              )}

              {/* Notify Vendor Button: for Assigned/In Progress with vendor assigned */}
              {!isClosed &&
                (complaint.status === "Assigned" ||
                  complaint.status === "In Progress") &&
                complaint.assignedTo && (
                  <>
                    <Button
                      type="button"
                      onClick={handleNotifyVendor}
                      className="w-full rounded-full border border-sky-500 text-sky-500 bg-transparent hover:bg-sky-500 hover:text-white text-xs font-semibold py-3 px-6 shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                    >
                      Notify Vendor
                    </Button>
                    <Button
                      type="button"
                      onClick={handleRemindVendor}
                      disabled={!canSendReminder(complaint.lastReminderSent)}
                      className="w-full rounded-full border border-primary text-primary bg-transparent hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold py-3 px-6 shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                      title={
                        !canSendReminder(complaint.lastReminderSent)
                          ? "Can remind after 24 hours from last reminder"
                          : "Send reminder to vendor"
                      }
                    >
                      {canSendReminder(complaint.lastReminderSent)
                        ? "Remind Vendor"
                        : `Remind in ${timeRemaining || "..."}`}
                    </Button>
                  </>
                )}

              {/* Report Button: for Fixed status only */}
              {complaint.status === "Fixed" && (
                <Button
                  type="button"
                  onClick={() => setReportModalOpen(true)}
                  className="w-full rounded-full border border-amber-500 text-amber-500 bg-transparent hover:bg-amber-500 hover:text-white text-xs font-semibold py-3 px-6 shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  Report Incomplete Work
                </Button>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Modal Dialogs */}
      <CloseComplaintModal
        open={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        onCloseSubmit={handleCloseWithReason}
      />

      <EditComplaintModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        complaint={complaint}
        onEditSubmit={handleEditSubmit}
      />

      {/* Report incomplete work modal */}
      <AnimatePresence>
        {reportModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-lg px-6"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
            >
              <GlassCard className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-semibold text-heading">
                      Report Incomplete Work
                    </p>
                    <p className="text-sm text-muted">
                      {complaint.id} - {complaint.title}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    size="icon-sm"
                    aria-label="Close"
                    className="border-red-500 bg-red-500 text-white hover:bg-transparent hover:text-red-500"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M6 6l12 12" />
                      <path d="M6 18L18 6" />
                    </svg>
                  </Button>
                </div>
                <form onSubmit={handleReportSubmit} className="mt-4 grid gap-4">
                  <label className="grid gap-2 text-sm text-heading font-medium">
                    Reason
                    <select
                      value={reportForm.reason}
                      onChange={(event) =>
                        setReportForm((prev) => ({
                          ...prev,
                          reason: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-border bg-surface/50 p-3.5 text-sm text-heading outline-none focus:border-primary focus:bg-surface transition-all duration-200"
                    >
                      <option value="Work was not completed">
                        Work was not completed
                      </option>
                      <option value="Issue still persists">
                        Issue still persists
                      </option>
                      <option value="Quality of work is poor">
                        Quality of work is poor
                      </option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm text-heading font-medium">
                    Remarks
                    <textarea
                      value={reportForm.details}
                      onChange={(event) =>
                        setReportForm((prev) => ({
                          ...prev,
                          details: event.target.value,
                        }))
                      }
                      rows={4}
                      placeholder="Add details for the superadmin..."
                      className="w-full rounded-2xl border border-border bg-surface/50 p-3.5 text-sm text-heading outline-none focus:border-primary focus:bg-surface min-h-[100px] resize-y transition-all duration-200"
                    />
                  </label>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setReportModalOpen(false)}
                      className="rounded-full border border-border hover:bg-surface"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="rounded-full border border-amber-500 bg-amber-500 text-white hover:bg-transparent hover:text-amber-500"
                    >
                      Send Report
                    </Button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FacultyComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <DashboardShell
      role="faculty"
      title="Complaint Detail"
      subtitle="Full trace of the issue"
      userName="Faculty"
      avatarUrl="/user-no-av.png"
    >
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center">
            <div className="text-muted font-medium animate-pulse">
              Loading complaint details...
            </div>
          </div>
        }
      >
        <FacultyComplaintDetailContent params={params} />
      </Suspense>
    </DashboardShell>
  );
}
