"use client";

import { Suspense, useEffect, useState, use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import ComplaintTimeline from "@/components/ComplaintTimeline";
import CloseComplaintModal from "@/components/CloseComplaintModal";
import { Button } from "@/components/ui/button";
import {
  getComplaint,
  closeComplaint,
  sendReminder,
  generateOtp,
  reportIssue,
} from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { Complaint } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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

  // OTP Verification States
  const [verifyOtpOpen, setVerifyOtpOpen] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);

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

  const handleOpenVerifyModal = async () => {
    if (!complaint) return;
    try {
      const response = await generateOtp(complaint.id);
      setGeneratedOtp(response.otp);
      setVerifyOtpOpen(true);
    } catch (error) {
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate OTP",
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
      // Refresh status details
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
  const isPendingOrOpen =
    complaint.status === "Open" || complaint.status === "Pending";

  return (
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

        <div className="mt-6 grid gap-3 text-sm text-body border-b border-border/50 pb-6">
          <div className="flex items-center justify-between">
            <span className="text-muted">Room</span>
            <span className="font-mono text-heading">{complaint.room}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Category</span>
            <span className="text-heading font-medium">{complaint.category}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Assigned vendor</span>
            <span className="text-heading">{complaint.assignedTo ?? "Unassigned"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Priority</span>
            <span className="text-heading">{complaint.priority}</span>
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
            <h3 className="text-sm font-semibold text-heading mb-2">
              Close Reason
            </h3>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
              <p className="text-sm text-amber-700 font-medium">
                {complaint.closeReason}
              </p>
            </div>
          </div>
        )}

        {complaint.images && complaint.images.length > 0 && (
          <div className="mt-6 border-b border-border/50 pb-6">
            <h3 className="text-sm font-semibold text-heading mb-3">
              Attachments
            </h3>
            <div className="grid grid-cols-2 gap-4">
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
          {/* Close Complaint Button: for Open/Pending status with no vendor assigned */}
          {!isClosed && isPendingOrOpen && !complaint.assignedTo && (
            <Button
              type="button"
              onClick={() => setCloseModalOpen(true)}
              disabled={closing}
              className="rounded-full border border-red-500 bg-red-500 text-white hover:bg-transparent hover:text-red-500 text-xs font-semibold py-2.5 px-6 shadow-sm transition-all duration-200 cursor-pointer"
            >
              Close Complaint
            </Button>
          )}

          {/* Remind Vendor Button: for Assigned/In Progress with vendor assigned */}
          {!isClosed &&
            (complaint.status === "Assigned" ||
              complaint.status === "In Progress") &&
            complaint.assignedTo && (
              <Button
                type="button"
                onClick={handleRemindVendor}
                disabled={!canSendReminder(complaint.lastReminderSent)}
                className="rounded-full border border-primary bg-primary text-white hover:bg-transparent hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold py-2.5 px-6 shadow-sm transition-all duration-200 cursor-pointer"
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
            )}

          {/* Verify Button: for Fixed status with work completed but not verified */}
          {complaint.status === "Fixed" &&
            complaint.workCompleted &&
            !complaint.otpVerified && (
              <Button
                type="button"
                onClick={handleOpenVerifyModal}
                className="rounded-full border border-purple-500 bg-purple-500 text-white hover:bg-transparent hover:text-purple-500 text-xs font-semibold py-2.5 px-6 shadow-sm transition-all duration-200 cursor-pointer"
              >
                Verify Work
              </Button>
            )}

          {/* Report Button: for Fixed/Closed status with OTP verified */}
          {(complaint.status === "Fixed" || complaint.status === "Closed") &&
            complaint.otpVerified && (
              <Button
                type="button"
                onClick={() => setReportModalOpen(true)}
                className="rounded-full border border-amber-500 bg-amber-500 text-white hover:bg-transparent hover:text-amber-500 text-xs font-semibold py-2.5 px-6 shadow-sm transition-all duration-200 cursor-pointer"
              >
                Report Incomplete Work
              </Button>
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
            isClosedDirectly={
              complaint.status === "Closed" && !complaint.assignedTo
            }
          />
        </div>
      </GlassCard>

      <CloseComplaintModal
        open={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        onCloseSubmit={handleCloseWithReason}
      />

      {/* Verify OTP modal */}
      <AnimatePresence>
        {verifyOtpOpen && generatedOtp && (
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
                      Verify Work Completion
                    </p>
                    <p className="text-sm text-muted">
                      {complaint.id} - {complaint.title}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setVerifyOtpOpen(false);
                      setGeneratedOtp(null);
                    }}
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
                <div className="mt-4 grid gap-4">
                  <div>
                    <p className="text-sm text-body mb-3">
                      Share this OTP with {complaint.assignedTo} to verify that
                      the work has been completed:
                    </p>
                    <div className="rounded-2xl border-2 border-purple-500 bg-surface/80 p-4 text-center">
                      <p className="text-3xl font-bold tracking-widest text-purple-500">
                        {generatedOtp}
                      </p>
                    </div>
                    <p className="mt-3 text-xs text-muted text-center">
                      The vendor will enter this OTP on their side to confirm
                      work completion
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      setVerifyOtpOpen(false);
                      setGeneratedOtp(null);
                    }}
                    className="rounded-full border border-border hover:bg-surface"
                  >
                    Close
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
