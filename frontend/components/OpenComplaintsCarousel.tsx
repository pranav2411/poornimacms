"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  closeComplaint,
  generateOtp,
  getComplaints,
  reportIssue,
  sendReminder,
} from "@/lib/api";
import type { Complaint } from "@/lib/types";
import { useToast } from "@/lib/toast";

export default function OpenComplaintsCarousel() {
  const { addToast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isNavHovered, setIsNavHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const openComplaints = complaints.filter(
    (complaint) =>
      (complaint.status !== "Fixed" && complaint.status !== "Closed") ||
      (complaint.status === "Fixed" && complaint.workCompleted && !complaint.otpVerified)
  );
  const cardCount = openComplaints.length;
  const visibleCount = 3;
  const cardWidth = 300;
  const focusedCardWidth = 380;
  const cardGap = 24;
  const arrowGutter = 72;
  const visibleSlots = Math.min(visibleCount, Math.max(cardCount, 1));
  const containerWidth =
    cardWidth * visibleSlots +
    cardGap * Math.max(visibleSlots - 1, 0) +
    (visibleSlots > 0 ? focusedCardWidth - cardWidth : 0);
  const outerWidth = containerWidth + arrowGutter * 2;

  const visibleIndices = useMemo(() => {
    if (cardCount === 0) return [];
    if (cardCount <= visibleCount) {
      return openComplaints.map((_, index) => index);
    }

    const prevIndex = (activeIndex - 1 + cardCount) % cardCount;
    const nextIndex = (activeIndex + 1) % cardCount;
    return [prevIndex, activeIndex, nextIndex];
  }, [activeIndex, cardCount, openComplaints, visibleCount]);

  const centerPosition = Math.max(0, visibleIndices.indexOf(activeIndex));
  const focusedIndex = isNavHovered ? centerPosition : hoveredIndex ?? centerPosition;

  // State for modals
  const [closeConfirm, setCloseConfirm] = useState<Complaint | null>(null);
  const [remindVendor, setRemindVendor] = useState<Complaint | null>(null);
  const [verifyOTP, setVerifyOTP] = useState<Complaint | null>(null);
  const [reportComplaint, setReportComplaint] = useState<Complaint | null>(null);
  
  // State for actions
  const [closeReason, setCloseReason] = useState("");
  const [generatedOTP, setGeneratedOTP] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<Record<string, string>>({});
  const [reportForm, setReportForm] = useState({
    reason: "Work was not completed",
    details: "",
  });

  useEffect(() => {
    let isMounted = true;

    const loadComplaints = async () => {
      try {
        const data = await getComplaints();
        if (isMounted) setComplaints(data);
      } catch {
        if (isMounted) setComplaints([]);
      }
    };

    loadComplaints();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (cardCount === 0) return;
    setActiveIndex((prev) => ((prev % cardCount) + cardCount) % cardCount);
  }, [cardCount]);

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
    }, 60000);

    return () => clearInterval(interval);
  }, [complaints]);

  const canSendReminder = (complaintId: string): boolean => {
    const complaint = complaints.find((item) => item.id === complaintId);
    const lastReminder = complaint?.lastReminderSent;
    if (!lastReminder) return true;

    const lastReminderTime = new Date(lastReminder).getTime();
    const now = new Date().getTime();
    const hoursPassed = (now - lastReminderTime) / (1000 * 60 * 60);
    return hoursPassed >= 24;
  };

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
    } catch (error) {
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit report",
        variant: "destructive",
      });
    }
  }

  const transition = shouldReduceMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 240, damping: 28 };

  const handlePrevious = () => {
    if (cardCount === 0) return;
    setActiveIndex((prev) => (prev - 1 + cardCount) % cardCount);
  };

  const handleNext = () => {
    if (cardCount === 0) return;
    setActiveIndex((prev) => (prev + 1) % cardCount);
  };

  return (
    <>
      <GlassCard className="w-full max-w-full overflow-hidden p-6 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Faculty overview
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-heading">
              Open complaints
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Use the arrow buttons to navigate complaints. The complaint in focus expands while the rest stay compact.
            </p>
          </div>
          <div className="text-sm text-muted">
            {openComplaints.length} open complaint{openComplaints.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-6">
          <div
            className="relative mx-auto flex items-center"
            style={{ width: `${outerWidth}px` }}
          >
            <Button
              type="button"
              onClick={handlePrevious}
              onMouseEnter={() => setIsNavHovered(true)}
              onMouseLeave={() => setIsNavHovered(false)}
              onFocus={() => setIsNavHovered(true)}
              onBlur={() => setIsNavHovered(false)}
              variant="outline"
              size="icon-sm"
              className="absolute left-0 top-1/2 z-10 -translate-y-1/2 border-border bg-surface text-heading shadow-xl ring-1 ring-border/70 hover:bg-surface hover:text-heading"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4 text-heading" />
            </Button>

            <div className="mx-auto overflow-hidden" style={{ width: `${containerWidth}px` }}>
              <div
                className={cn("flex gap-6 pb-2")}
                style={{ width: `${containerWidth}px` }}
                aria-label="Open complaints carousel"
              >
              {visibleIndices.map((complaintIndex, position) => {
              const complaint = openComplaints[complaintIndex];
              if (!complaint) return null;
              const isProminent = focusedIndex === position;
              const cardHeight = 460;
              const currentCardWidth = isProminent ? focusedCardWidth : cardWidth;
              const roadmap = complaint.timeline ?? [];

            return (
              <motion.article
                key={`${complaint.id}-${complaintIndex}`}
                tabIndex={0}
                onMouseEnter={() => setHoveredIndex(position)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(position)}
                onBlur={() => setHoveredIndex(null)}
                animate={{
                  width: currentCardWidth,
                  height: cardHeight,
                  y: isProminent ? -6 : 8,
                  opacity: isProminent ? 1 : 0.82,
                  scale: isProminent ? 1.01 : 0.99,
                }}
                style={{ flex: "0 0 auto", width: currentCardWidth, minWidth: currentCardWidth }}
                transition={transition}
                className={cn(
                  "group relative flex-none overflow-hidden rounded-[2rem] border border-border/80",
                  "bg-surface/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)] outline-none",
                  "focus-visible:ring-2 focus-visible:ring-accent/40"
                )}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(26,63,170,0.08),transparent_48%)]" />
                <div className="relative flex h-full flex-col gap-3 p-5 md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                        {complaint.id}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-heading">
                        {complaint.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        {complaint.room} · {complaint.category}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusPill status={complaint.status} />
                      <span className="rounded-full border border-border bg-surface/80 px-3 py-1 text-xs font-medium text-heading">
                        {complaint.priority} priority
                      </span>
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-body">
                    {complaint.description}
                  </p>

                  <div className="rounded-2xl border border-border/80 bg-surface/70 p-3 backdrop-blur-sm flex-1 overflow-y-auto">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                          Roadmap
                        </p>
                        <p className="text-xs text-body">
                          Latest updates
                        </p>
                      </div>
                      <span className="text-xs font-medium text-muted">
                        {complaint.updatedAt}
                      </span>
                    </div>

                    <div className="mt-3 space-y-3">
                      {roadmap.map((item, timelineIndex) => {
                        const isLast = timelineIndex === roadmap.length - 1;

                        return (
                          <div key={`${complaint.id}-${item.label}-${timelineIndex}`} className="relative pl-5">
                            <span
                              className={cn(
                                "absolute left-[0.2rem] top-2.5 h-2.5 w-2.5 rounded-full border-2 border-surface",
                                timelineIndex === 0 ? "bg-primary" : "bg-accent"
                              )}
                            />
                            {!isLast && (
                              <span className="absolute left-[0.6rem] top-4 h-[calc(100%+0.5rem)] w-px bg-border" />
                            )}
                            <p className="text-xs font-medium text-heading">{item.label}</p>
                            <p className="mt-0.5 text-[0.65rem] uppercase tracking-[0.16em] text-muted">
                              {item.time}
                            </p>
                          </div>
                        );
                      })}

                      {roadmap.length === 0 && (
                        <p className="text-xs text-muted">
                          No updates yet.
                        </p>
                      )}
                    </div>
                  </div>

                  {isProminent && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {complaint.status === "Pending" && !complaint.assignedTo && (
                        <Button
                          type="button"
                          onClick={() => setCloseConfirm(complaint)}
                          size="sm"
                          className="inline-flex items-center gap-2 border-green-500 bg-green-500 text-surface hover:bg-transparent hover:text-green-500 text-xs"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Close
                        </Button>
                      )}

                      {(complaint.status === "Assigned" || complaint.status === "In Progress") && complaint.assignedTo && (
                        <Button
                          type="button"
                          onClick={() => setRemindVendor(complaint)}
                          size="sm"
                          disabled={!canSendReminder(complaint.id)}
                          className="inline-flex items-center gap-2 border-blue-500 bg-blue-500 text-surface disabled:opacity-50 disabled:cursor-not-allowed hover:bg-transparent hover:text-blue-500 disabled:hover:bg-blue-500 disabled:hover:text-surface text-xs"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                          {canSendReminder(complaint.id) ? "Remind" : `In ${timeRemaining[complaint.id] || "..."}`}
                        </Button>
                      )}

                      {complaint.status === "Fixed" && complaint.workCompleted && !complaint.otpVerified && (
                        <Button
                          type="button"
                          onClick={() => handleOpenVerifyModal(complaint)}
                          size="sm"
                          className="inline-flex items-center gap-2 border-purple-500 bg-purple-500 text-surface hover:bg-transparent hover:text-purple-500 text-xs"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-3 w-3"
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
                          Verify
                        </Button>
                      )}

                      {complaint.status === "Fixed" && complaint.otpVerified && (
                        <Button
                          type="button"
                          onClick={() => setReportComplaint(complaint)}
                          size="sm"
                          className="inline-flex items-center gap-2 border-amber-500 bg-amber-500 text-surface hover:bg-transparent hover:text-amber-500 text-xs"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-3 w-3"
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
                          Report
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </motion.article>
            );
            })}
              </div>
            </div>

            <Button
              type="button"
              onClick={handleNext}
              onMouseEnter={() => setIsNavHovered(true)}
              onMouseLeave={() => setIsNavHovered(false)}
              onFocus={() => setIsNavHovered(true)}
              onBlur={() => setIsNavHovered(false)}
              variant="outline"
              size="icon-sm"
              className="absolute right-0 top-1/2 z-10 -translate-y-1/2 border-border bg-surface text-heading shadow-xl ring-1 ring-border/70 hover:bg-surface hover:text-heading"
            >
              <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4 text-heading" />
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Close confirmation modal */}
      {closeConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 px-4">
          <div className="w-full max-w-lg">
            <GlassCard className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold text-heading">Close complaint</p>
                  <p className="text-sm text-muted">{closeConfirm.id} - {closeConfirm.title}</p>
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
                  size="sm"
                  className="border-green-500 bg-green-500 text-surface hover:bg-transparent hover:text-green-500"
                >
                  Close complaint
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      ) : null}

      {/* Remind vendor modal */}
      {remindVendor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 px-4">
          <div className="w-full max-w-lg">
            <GlassCard className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold text-heading">Send reminder</p>
                  <p className="text-sm text-muted">{remindVendor.id} - {remindVendor.title}</p>
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

      {/* Verify OTP modal */}
      {verifyOTP && generatedOTP ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 px-4">
          <div className="w-full max-w-lg">
            <GlassCard className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold text-heading">Verify work completion</p>
                  <p className="text-sm text-muted">{verifyOTP.id} - {verifyOTP.title}</p>
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
                    The vendor will enter this OTP on their side to confirm work completion
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
                  <p className="text-lg font-semibold text-heading">Report incomplete work</p>
                  <p className="text-sm text-muted">{reportComplaint.id} - {reportComplaint.title}</p>
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
                    <option value="Work was not completed">Work was not completed</option>
                    <option value="Issue still persists">Issue still persists</option>
                    <option value="Quality of work is poor">Quality of work is poor</option>
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
    </>
  );
}