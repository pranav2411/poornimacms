"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import {
  closeComplaint,
  generateOtp,
  getComplaints,
  reportIssue,
  sendReminder,
} from "@/lib/api";
import type { Complaint } from "@/lib/types";
import { useToast } from "@/lib/toast";
import { cn, formatDateTime } from "@/lib/utils";

export default function FacultyComplaintsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { addToast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openDetailsId, setOpenDetailsId] = useState<string | null>(null);
  const [reportComplaint, setReportComplaint] = useState<Complaint | null>(null);
  const [closeConfirm, setCloseConfirm] = useState<Complaint | null>(null);
  const [remindVendor, setRemindVendor] = useState<Complaint | null>(null);
  const [verifyOTP, setVerifyOTP] = useState<Complaint | null>(null);
  const [generatedOTP, setGeneratedOTP] = useState<string | null>(null);
  const [closeReason, setCloseReason] = useState("");
  const [reportForm, setReportForm] = useState({
    reason: "Work was not completed",
    details: "",
  });
  const [timeRemaining, setTimeRemaining] = useState<Record<string, string>>({});

  const selectedComplaint = openDetailsId
    ? complaints.find((item) => item.id === openDetailsId) ?? null
    : null;

  const handleRefresh = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      setIsLoading(true);
      const data = await getComplaints({ createdBy: session.user.id });
      setComplaints(data);
    } catch (error) {
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to refresh complaints list",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, addToast]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  // Update countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeRemaining: Record<string, string> = {};

      complaints.forEach((complaint) => {
        if (!complaint.lastReminderSent) return;
        const lastReminderTime = new Date(complaint.lastReminderSent).getTime();
        const now = new Date().getTime();
        const msRemaining = 24 * 60 * 60 * 1000 - (now - lastReminderTime);

        if (msRemaining > 0) {
          const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
          const minutesRemaining = Math.floor(
            (msRemaining % (1000 * 60 * 60)) / (1000 * 60)
          );

          if (hoursRemaining > 0) {
            newTimeRemaining[complaint.id] = `${hoursRemaining}h`;
          } else {
            newTimeRemaining[complaint.id] = `${minutesRemaining}m`;
          }
        }
      });

      setTimeRemaining(newTimeRemaining);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [complaints]);

  // Check if 24 hours have passed since last reminder
  const canSendReminder = (complaintId: string): boolean => {
    const complaint = complaints.find((item) => item.id === complaintId);
    const lastReminder = complaint?.lastReminderSent;
    if (!lastReminder) return true;

    const lastReminderTime = new Date(lastReminder).getTime();
    const now = new Date().getTime();
    const hoursPassed = (now - lastReminderTime) / (1000 * 60 * 60);
    return hoursPassed >= 24;
  };

  // Generate a random 6-digit OTP
  const handleCloseComplaint = async () => {
    if (!closeConfirm || !closeReason.trim()) {
      addToast({
        title: "Error",
        description: "Please enter a reason for closing the complaint",
        variant: "destructive",
      });
      return;
    }

    try {
      const updated = await closeComplaint(closeConfirm.id, closeReason.trim());
      setComplaints((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      addToast({
        title: "Success",
        description: `Complaint ${closeConfirm.id} has been closed`,
      });
      setCloseConfirm(null);
      setCloseReason("");
      setOpenDetailsId(null);
    } catch (error) {
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to close complaint",
        variant: "destructive",
      });
    }
  };

  const handleRemindVendor = async () => {
    if (!remindVendor) return;
    try {
      const updated = await sendReminder(remindVendor.id);
      setComplaints((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      addToast({
        title: "Reminder Sent",
        description: `Reminder sent to ${remindVendor.assignedTo}`,
      });
      setRemindVendor(null);
    } catch (error) {
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send reminder",
        variant: "destructive",
      });
    }
  };

  const handleReportSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reportComplaint) return;
    try {
      await reportIssue(reportComplaint.id, reportForm.reason, reportForm.details);
      addToast({
        title: "Report Submitted",
        description: `Report sent to superadmin for ${reportComplaint.id}`,
      });
      setReportComplaint(null);
      setReportForm({ reason: "Work was not completed", details: "" });
      setOpenDetailsId(null);
    } catch (error) {
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit report",
        variant: "destructive",
      });
    }
  };

  const handleOpenVerifyModal = async (complaint: Complaint) => {
    try {
      const response = await generateOtp(complaint.id);
      setGeneratedOTP(response.otp);
      setVerifyOTP(complaint);
    } catch (error) {
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate OTP",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardShell
      role="faculty"
      title="My Complaints"
      subtitle="All issues reported by your faculty account"
      userName="Dr. Aditi Sharma"
      avatarUrl="/user-no-av.png"
      headerActions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 border-border bg-surface text-heading hover:bg-surface/85"
        >
          <svg
            className={cn("h-4 w-4 text-heading", isLoading && "animate-spin")}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M21 3v5h-5"
            />
          </svg>
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      }
    >
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-heading">Complaint list</h2>
            <p className="text-sm text-muted">
              Review status and assignment progress.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`complaint-skeleton-${index}`}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/40 p-4 md:flex-row md:items-center md:justify-between animate-pulse"
              >
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              </div>
            ))
          ) : complaints.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface/70 p-6 text-center">
              <p className="text-sm font-semibold text-heading">
                No complaints found.
              </p>
              <p className="mt-2 text-sm text-muted">
                You haven't submitted any complaints yet.
              </p>
            </div>
          ) : (
            complaints.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/70 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-heading">{item.title}</p>
                  <p className="text-xs text-muted">
                    {item.room} - {item.category}
                  </p>
                  {item.closeReason && item.status === "Closed" && (
                    <p className="mt-2 text-xs text-amber-500">
                      Closed: {item.closeReason}
                    </p>
                  )}
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <div className="ml-auto flex flex-wrap items-center gap-3">
                    <StatusPill status={item.status} />
                    <span className="text-xs text-muted">{formatDateTime(item.updatedAt)}</span>
                    <Button
                      type="button"
                      onClick={() => router.push(`/dashboard/faculty/complaints/${item.id}`)}
                      size="sm"
                      className="border-accent bg-accent text-surface hover:bg-transparent hover:text-accent"
                    >
                      View details
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>
      {selectedComplaint ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-bg/70 px-4">
          <div className="w-full max-w-2xl">
            <GlassCard className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold text-heading">
                    Complaint details
                  </p>
                  <p className="text-sm text-muted">
                    {selectedComplaint.id} - {selectedComplaint.title}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setOpenDetailsId(null)}
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
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  Timeline
                </p>
                {(selectedComplaint.timeline ?? []).length === 0 ? (
                  <p className="mt-3 text-xs text-muted">
                    No timeline updates yet.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-3">
                    {(selectedComplaint.timeline ?? []).map((step) => (
                      <div
                        key={`${selectedComplaint.id}-${step.label}-${step.time}`}
                        className="rounded-xl border border-border/70 bg-surface/80 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-heading">
                              {step.label}
                            </p>
                            {step.remarks ? (
                              <p className="mt-1 text-xs text-body/80">
                                {step.remarks}
                              </p>
                            ) : null}
                          </div>
                          <span className="text-[0.65rem] text-muted">
                            {formatDateTime(step.time)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedComplaint.closeReason && selectedComplaint.status === "Closed" && (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-xs font-semibold text-amber-600">
                    Close Reason
                  </p>
                  <p className="mt-1 text-xs text-amber-600/80">
                    {selectedComplaint.closeReason}
                  </p>
                </div>
              )}

              <div className="mt-5 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  onClick={() => setOpenDetailsId(null)}
                  size="sm"
                  className="border-border bg-surface text-heading hover:bg-transparent hover:text-heading"
                >
                  Back
                </Button>

                <div className="flex items-center gap-3">
                  {/* Close button - for Pending/Open status with no vendor assigned */}
                  {(selectedComplaint.status.toLowerCase() === "pending" ||
                    selectedComplaint.status.toLowerCase() === "open") &&
                    !selectedComplaint.assignedTo && (
                      <Button
                        type="button"
                        onClick={() => setCloseConfirm(selectedComplaint)}
                        size="sm"
                        className="inline-flex items-center gap-2 border-green-500 bg-green-500 text-surface hover:bg-transparent hover:text-green-500"
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
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Close issue
                      </Button>
                    )}

                  {/* Remind vendor button - for Assigned/In Progress with vendor assigned */}
                  {(selectedComplaint.status.toLowerCase() === "assigned" ||
                    selectedComplaint.status.toLowerCase() === "in progress") &&
                    selectedComplaint.assignedTo && (
                      <Button
                        type="button"
                        onClick={() => setRemindVendor(selectedComplaint)}
                        size="sm"
                        disabled={!canSendReminder(selectedComplaint.id)}
                        className="inline-flex items-center gap-2 border-blue-500 bg-blue-500 text-surface disabled:opacity-50 disabled:cursor-not-allowed hover:bg-transparent hover:text-blue-500 disabled:hover:bg-blue-500 disabled:hover:text-surface"
                        title={
                          !canSendReminder(selectedComplaint.id)
                            ? "Can remind after 24 hours from last reminder"
                            : "Send reminder to vendor"
                        }
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
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        {canSendReminder(selectedComplaint.id)
                          ? "Remind vendor"
                          : `Remind vendor in ${timeRemaining[selectedComplaint.id] || "..."}`}
                      </Button>
                    )}

                  {/* Verify button - for Fixed status with work completed but not verified */}
                  {selectedComplaint.status === "Fixed" &&
                    selectedComplaint.workCompleted &&
                    !selectedComplaint.otpVerified && (
                      <Button
                        type="button"
                        onClick={() =>
                          handleOpenVerifyModal(selectedComplaint)
                        }
                        size="sm"
                        className="inline-flex items-center gap-2 border-purple-500 bg-purple-500 text-surface hover:bg-transparent hover:text-purple-500"
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
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                          <path d="M10 17l-5-5" />
                          <path d="M14 12l-4 5" />
                        </svg>
                        Verify work
                      </Button>
                    )}

                  {/* Report button - for Fixed/Closed status with OTP verified */}
                  {(selectedComplaint.status === "Fixed" ||
                    selectedComplaint.status === "Closed") &&
                    selectedComplaint.otpVerified && (
                      <Button
                        type="button"
                        onClick={() => {
                          setOpenDetailsId(null);
                          setReportComplaint(selectedComplaint);
                        }}
                        size="sm"
                        className="inline-flex items-center gap-2 border-amber-500 bg-amber-500 text-surface hover:bg-transparent hover:text-amber-500"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M12 3l9 16H3l9-16z" />
                          <path d="M12 9v4" />
                          <path d="M12 17h.01" />
                        </svg>
                        Report issue
                      </Button>
                    )}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      ) : null}

      {/* Close complaint modal with reason input */}
      {closeConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 px-4">
          <div className="w-full max-w-lg">
            <GlassCard className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold text-heading">
                    Close Complaint
                  </p>
                  <p className="text-sm text-muted">
                    {closeConfirm.id} - {closeConfirm.title}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    setCloseConfirm(null);
                    setCloseReason("");
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
                <label className="grid gap-2 text-sm text-heading">
                  Reason for closing
                  <textarea
                    value={closeReason}
                    onChange={(e) => setCloseReason(e.target.value)}
                    rows={4}
                    placeholder="Please provide the reason for closing this complaint..."
                    className="rounded-2xl border border-border bg-surface/80 px-3 py-2 text-sm text-heading"
                  />
                </label>
              </div>
              <div className="mt-5 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    setCloseConfirm(null);
                    setCloseReason("");
                  }}
                  size="sm"
                  className="border-border bg-surface text-heading hover:bg-transparent hover:text-heading"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCloseComplaint}
                  disabled={!closeReason.trim()}
                  size="sm"
                  className="border-green-500 bg-green-500 text-surface disabled:cursor-not-allowed disabled:opacity-50 hover:bg-transparent hover:text-green-500 disabled:hover:bg-green-500 disabled:hover:text-surface"
                >
                  Close Complaint
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      ) : null}

      {/* Remind vendor confirmation modal */}
      {remindVendor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 px-4">
          <div className="w-full max-w-lg">
            <GlassCard className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold text-heading">
                    Send reminder
                  </p>
                  <p className="text-sm text-muted">
                    {remindVendor.id} - {remindVendor.title}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setRemindVendor(null)}
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
              <div className="mt-4">
                <p className="text-sm text-body">
                  Send a reminder to{" "}
                  <span className="font-semibold">{remindVendor.assignedTo}</span>{" "}
                  to complete the assigned work. You can only remind the vendor once every 24 hours.
                </p>
              </div>
              <div className="mt-5 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  onClick={() => setRemindVendor(null)}
                  size="sm"
                  className="border-border bg-surface text-heading hover:bg-transparent hover:text-heading"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleRemindVendor}
                  size="sm"
                  className="border-blue-500 bg-blue-500 text-surface hover:bg-transparent hover:text-blue-500"
                >
                  Send reminder
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      ) : null}

      {/* Verify OTP modal - only shows OTP to faculty, vendor enters it separately */}
      {verifyOTP && generatedOTP ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 px-4">
          <div className="w-full max-w-lg">
            <GlassCard className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold text-heading">
                    Verify work completion
                  </p>
                  <p className="text-sm text-muted">
                    {verifyOTP.id} - {verifyOTP.title}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    setVerifyOTP(null);
                    setGeneratedOTP(null);
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
                    Share this OTP with {verifyOTP.assignedTo} to verify that
                    the work has been completed:
                  </p>
                  <div className="rounded-2xl border-2 border-purple-500 bg-surface/80 p-4 text-center">
                    <p className="text-3xl font-bold tracking-widest text-purple-500">
                      {generatedOTP}
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-muted text-center">
                    The vendor will enter this OTP on their side to confirm
                    work completion
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    setVerifyOTP(null);
                    setGeneratedOTP(null);
                  }}
                  size="sm"
                  className="border-border bg-surface text-heading hover:bg-transparent hover:text-heading"
                >
                  Close
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      ) : null}

      {/* Report issue modal */}
      {reportComplaint ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 px-4">
          <div className="w-full max-w-lg">
            <GlassCard className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold text-heading">
                    Report incomplete work
                  </p>
                  <p className="text-sm text-muted">
                    {reportComplaint.id} - {reportComplaint.title}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setReportComplaint(null)}
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
                <label className="grid gap-2 text-sm text-heading">
                  Reason
                  <select
                    value={reportForm.reason}
                    onChange={(event) =>
                      setReportForm((prev) => ({
                        ...prev,
                        reason: event.target.value,
                      }))
                    }
                    className="rounded-2xl border border-border bg-surface/80 px-3 py-2 text-sm text-heading"
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
                <label className="grid gap-2 text-sm text-heading">
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
                    placeholder="Add details for the superadmin"
                    className="rounded-2xl border border-border bg-surface/80 px-3 py-2 text-sm text-heading"
                  />
                </label>
                <div className="flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    onClick={() => setReportComplaint(null)}
                    size="sm"
                    className="border-border bg-surface text-heading hover:bg-transparent hover:text-heading"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="border-amber-500 bg-amber-500 text-surface hover:bg-transparent hover:text-amber-500"
                  >
                    Send report
                  </Button>
                </div>
              </form>
            </GlassCard>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
