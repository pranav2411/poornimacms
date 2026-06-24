"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  closeComplaint,
  getComplaint,
  getComplaints,
  reportIssue,
  sendReminder,
  verifySolution,
} from "@/lib/api";
import type { Complaint } from "@/lib/types";
import { useToast } from "@/lib/toast";

const priorityStyles: Record<string, string> = {
  low: "bg-fixed/15 text-fixed border-fixed/30",
  medium: "bg-pending/15 text-pending border-pending/30",
  high: "bg-red-500/15 text-red-500 border-red-500/30",
};

export default function OpenComplaintsCarousel() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  const handleRefreshComplaint = async (complaintId: string) => {
    setRefreshingIds((prev) => {
      const next = new Set(prev);
      next.add(complaintId);
      return next;
    });

    try {
      const updated = await getComplaint(complaintId);
      setComplaints((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      addToast({
        title: "Stats Refreshed",
        description: `Successfully refreshed stats for complaint ${complaintId}.`,
      });
    } catch (error) {
      addToast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh complaint stats.",
        variant: "destructive",
      });
    } finally {
      setRefreshingIds((prev) => {
        const next = new Set(prev);
        next.delete(complaintId);
        return next;
      });
    }
  };
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isNavHovered, setIsNavHovered] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [windowWidth, setWindowWidth] = useState(375);
  const shouldReduceMotion = useReducedMotion();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const openComplaints = complaints.filter(
    (complaint) => complaint.status !== "Closed"
  );
  const cardCount = openComplaints.length;
  const cardWidth = isCompact ? Math.min(300, windowWidth - 48) : 360;
  const cardGap = 24;

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.offsetWidth;
    const centerPoint = scrollLeft + containerWidth / 2;

    let closestIndex = 0;
    let minDistance = Infinity;

    const cards = container.children;
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i] as HTMLElement;
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(centerPoint - cardCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    if (closestIndex !== activeIndex && closestIndex >= 0 && closestIndex < cardCount) {
      setActiveIndex(closestIndex);
    }
  }, [activeIndex, cardCount]);

  const scrollToIndex = useCallback((index: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const cards = container.children;
    if (cards[index]) {
      const card = cards[index] as HTMLElement;
      const targetScroll = card.offsetLeft - (container.offsetWidth - card.offsetWidth) / 2;
      container.scrollTo({
        left: targetScroll,
        behavior: "smooth",
      });
      setActiveIndex(index);
    }
  }, []);

  const handlePrevious = () => {
    if (cardCount === 0) return;
    const prevIdx = (activeIndex - 1 + cardCount) % cardCount;
    scrollToIndex(prevIdx);
  };

  const handleNext = () => {
    if (cardCount === 0) return;
    const nextIdx = (activeIndex + 1) % cardCount;
    scrollToIndex(nextIdx);
  };

  const focusedIndex = isNavHovered ? activeIndex : hoveredIndex ?? activeIndex;

  // State for modals
  const [closeConfirm, setCloseConfirm] = useState<Complaint | null>(null);
  const [remindVendor, setRemindVendor] = useState<Complaint | null>(null);
  const [reportComplaint, setReportComplaint] = useState<Complaint | null>(null);
  const [closeReason, setCloseReason] = useState("");
  const [timeRemaining, setTimeRemaining] = useState<Record<string, string>>({});
  const [reportForm, setReportForm] = useState({
    reason: "Work was not completed",
    details: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 768px)");
    const update = () => {
      setIsCompact(media.matches);
      setWindowWidth(window.innerWidth);
    };

    update();
    media.addEventListener("change", update);
    window.addEventListener("resize", update);

    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    let isMounted = true;

    const loadComplaints = async () => {
      try {
        setIsLoading(true);
        const params = session.user.role === "vendor"
          ? { assignedVendorId: session.user.id }
          : { createdBy: session.user.id };
        const data = await getComplaints(params);
        if (isMounted) {
          setComplaints(data);
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setComplaints([]);
          setIsLoading(false);
          addToast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to load open complaints",
            variant: "destructive",
          });
        }
      }
    };

    loadComplaints();
    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

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

  const handleVerifySolution = async (complaint: Complaint) => {
    try {
      const updated = await verifySolution(complaint.id);
      setComplaints((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      addToast({
        title: "Success",
        description: `Complaint ${complaint.id} marked as resolved`,
      });
    } catch (error) {
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify solution",
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
            {openComplaints.length === 0
              ? "No open complaints"
              : `${openComplaints.length} open complaint${openComplaints.length === 1 ? "" : "s"}`}
          </div>
        </div>

        {isLoading ? (
          <div className="mt-6 animate-pulse">
            <div className="relative mx-auto flex items-center justify-center gap-6 overflow-hidden">
              {/* Left Card Placeholder */}
              <div className="hidden md:block h-[460px] w-[300px] flex-none rounded-[2rem] border border-border/40 bg-surface/40 p-6">
                <Skeleton className="h-4 w-1/3 mb-4" />
                <Skeleton className="h-6 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-6" />
                <Skeleton className="h-24 w-full rounded-2xl mb-4" />
                <Skeleton className="h-12 w-full rounded-2xl" />
              </div>

              {/* Center Card Placeholder */}
              <div className="h-[460px] w-[380px] max-w-full flex-none rounded-[2rem] border border-border/80 bg-surface/70 p-6 shadow-md relative -translate-y-1">
                <Skeleton className="h-4 w-1/4 mb-4" />
                <Skeleton className="h-7 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-6" />
                <Skeleton className="h-28 w-full rounded-2xl mb-6" />
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-24 rounded-xl" />
                  <Skeleton className="h-10 w-24 rounded-xl" />
                </div>
              </div>

              {/* Right Card Placeholder */}
              <div className="hidden md:block h-[460px] w-[300px] flex-none rounded-[2rem] border border-border/40 bg-surface/40 p-6">
                <Skeleton className="h-4 w-1/3 mb-4" />
                <Skeleton className="h-6 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-6" />
                <Skeleton className="h-24 w-full rounded-2xl mb-4" />
                <Skeleton className="h-12 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        ) : openComplaints.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface/70 p-6 text-center">
            {session?.user?.role === "vendor" ? (
              <>
                <p className="text-sm font-semibold text-heading">
                  No assigned complaints right now.
                </p>
                <p className="mt-2 text-sm text-muted">
                  Please wait for your admin to assign you complaints.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-heading">
                  No open complaints right now.
                </p>
                <p className="mt-2 text-sm text-muted">
                  Have a complaint? File one and we'll get it in the queue.
                </p>
                <Button
                  asChild
                  size="sm"
                  className="mt-4 border-accent bg-accent text-surface hover:bg-transparent hover:text-accent"
                >
                  <Link href="/complaints/new">File new complaint</Link>
                </Button>
              </>
            )}
          </div>
        ) : cardCount === 1 ? (
          <div className="mt-6 flex justify-center">
            {openComplaints.map((complaint, index) => {
              const cardHeight = 460;
              const roadmap = complaint.timeline ?? [];
              return (
                <article
                  key={`${complaint.id}-${index}`}
                  tabIndex={0}
                  className={cn(
                    "group relative overflow-hidden rounded-[2rem] border",
                    "border-primary/40 bg-surface shadow-[0_20px_50px_rgba(26,63,170,0.08)]",
                    "backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  )}
                  style={{
                    height: cardHeight,
                    width: cardWidth,
                    minWidth: cardWidth,
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(26,63,170,0.04),transparent_48%)]" />
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
                        <p className="mt-0.5 text-xs text-muted">
                          Reported by: {complaint.createdByName || "Faculty User"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StatusPill status={complaint.status} />
                        <span
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium",
                            priorityStyles[complaint.priority.toLowerCase()] ||
                            "bg-muted/15 text-muted border-muted/30"
                          )}
                        >
                          {complaint.priority.charAt(0).toUpperCase() +
                            complaint.priority.slice(1).toLowerCase()}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm leading-6 text-body">
                      {complaint.description}
                    </p>

                    <div className="flex-1 overflow-y-auto rounded-2xl border border-border/80 bg-surface/70 p-3 backdrop-blur-sm">
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
                          {formatDateTime(complaint.updatedAt)}
                        </span>
                      </div>

                      <div className="mt-3 space-y-3">
                        {roadmap.map((item, timelineIndex) => {
                          const isLast = timelineIndex === roadmap.length - 1;

                          return (
                            <div
                              key={`${complaint.id}-${item.label}-${timelineIndex}`}
                              className="relative pl-5"
                            >
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
                                {formatDateTime(item.time)}
                              </p>
                            </div>
                          );
                        })}

                        {roadmap.length === 0 && (
                          <p className="text-xs text-muted">No updates yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {session?.user?.role === "vendor" ? (
                        <Button
                          asChild
                          size="sm"
                          className="inline-flex items-center gap-2 border-accent bg-accent text-surface hover:bg-transparent hover:text-accent text-xs"
                        >
                          <Link href={`/dashboard/vendor/assignments/${complaint.id}`}>
                            View Details
                          </Link>
                        </Button>
                      ) : (
                        <>
                          {(complaint.status.toLowerCase() === "pending" ||
                            complaint.status.toLowerCase() === "open") &&
                            !complaint.assignedTo && (
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

                          {(complaint.status === "Assigned" || complaint.status === "In Progress") &&
                            complaint.assignedTo && (
                              <Button
                                type="button"
                                onClick={() => setRemindVendor(complaint)}
                                size="sm"
                                disabled={!canSendReminder(complaint.id)}
                                className="inline-flex items-center gap-2 border-blue-500 bg-blue-500 text-surface disabled:cursor-not-allowed disabled:opacity-50 hover:bg-transparent hover:text-blue-500 disabled:hover:bg-blue-500 disabled:hover:text-surface text-xs"
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
                                {canSendReminder(complaint.id)
                                  ? "Remind"
                                  : `In ${timeRemaining[complaint.id] || "..."}`}
                              </Button>
                            )}

                          {complaint.status === "Fixed" && (
                            <Button
                              type="button"
                              onClick={() => handleVerifySolution(complaint)}
                              size="sm"
                              className="inline-flex items-center gap-2 border-purple-500 bg-purple-500 text-surface hover:bg-transparent hover:text-purple-500 text-xs"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                              </svg>
                              Verify
                            </Button>
                          )}
                          {complaint.status === "Fixed" && (
                            <Button
                              type="button"
                              onClick={() => setReportComplaint(complaint)}
                              size="sm"
                              className="inline-flex items-center gap-2 border-amber-500 bg-amber-500 text-surface hover:bg-transparent hover:text-amber-500 text-xs"
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
                              Report
                            </Button>
                          )}
                        </>
                      )}
                      <Button
                        type="button"
                        onClick={() => handleRefreshComplaint(complaint.id)}
                        disabled={refreshingIds.has(complaint.id)}
                        size="sm"
                        className="inline-flex items-center gap-1.5 border-border bg-surface text-heading hover:bg-surface/80 text-xs"
                      >
                        <svg
                          className={cn(
                            "h-3.5 w-3.5 text-heading",
                            refreshingIds.has(complaint.id) && "animate-spin"
                          )}
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M21 3v5h-5"
                          />
                        </svg>
                        Refresh
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div >
        ) : (
          <div className="mt-6">
            <div className="relative mx-auto flex max-w-full items-center w-full">
              {cardCount > 1 && (
                <Button
                  type="button"
                  onClick={handlePrevious}
                  onMouseEnter={() => setIsNavHovered(true)}
                  onMouseLeave={() => setIsNavHovered(false)}
                  onFocus={() => setIsNavHovered(true)}
                  onBlur={() => setIsNavHovered(false)}
                  variant="outline"
                  size="icon-sm"
                  className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 border-border bg-surface text-heading shadow-xl ring-1 ring-border/70 hover:bg-surface hover:text-heading md:inline-flex"
                >
                  <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4 text-heading" />
                </Button>
              )}

              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="mx-auto w-full overflow-x-auto flex gap-6 pb-6 scrollbar-none snap-x snap-mandatory scroll-smooth"
                style={{
                  paddingLeft: `calc(50% - ${cardWidth / 2}px)`,
                  paddingRight: `calc(50% - ${cardWidth / 2}px)`,
                }}
                aria-label="Open complaints carousel"
              >
                {openComplaints.map((complaint, index) => {
                  const isProminent = focusedIndex === index;
                  const cardHeight = 460;
                  const roadmap = complaint.timeline ?? [];

                  return (
                    <motion.article
                      key={`${complaint.id}-${index}`}
                      tabIndex={0}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onFocus={() => setHoveredIndex(index)}
                      onBlur={() => setHoveredIndex(null)}
                      animate={{
                        height: cardHeight,
                        y: isProminent ? -6 : 8,
                        opacity: isProminent ? 1 : 0.75,
                        scale: isProminent ? 1.02 : 0.96,
                      }}
                      style={{
                        flex: "0 0 auto",
                        width: cardWidth,
                        minWidth: cardWidth,
                      }}
                      transition={transition}
                      className={cn(
                        "group relative flex-none overflow-hidden rounded-[2rem] border snap-center",
                        isProminent
                          ? "border-primary/40 bg-surface shadow-[0_20px_50px_rgba(26,63,170,0.08)]"
                          : "border-border/80 bg-surface/80 shadow-sm",
                        "backdrop-blur-md outline-none",
                        "focus-visible:ring-2 focus-visible:ring-accent/40"
                      )}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(26,63,170,0.04),transparent_48%)]" />
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
                            <p className="mt-0.5 text-xs text-muted">
                              Reported by: {complaint.createdByName || "Faculty User"}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <StatusPill status={complaint.status} />
                            <span
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs font-medium",
                                priorityStyles[complaint.priority.toLowerCase()] ||
                                "bg-muted/15 text-muted border-muted/30"
                              )}
                            >
                              {complaint.priority.charAt(0).toUpperCase() +
                                complaint.priority.slice(1).toLowerCase()}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm leading-6 text-body">
                          {complaint.description}
                        </p>

                        <div className="flex-1 overflow-y-auto rounded-2xl border border-border/80 bg-surface/70 p-3 backdrop-blur-sm">
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
                              {formatDateTime(complaint.updatedAt)}
                            </span>
                          </div>

                          <div className="mt-3 space-y-3">
                            {roadmap.map((item, timelineIndex) => {
                              const isLast = timelineIndex === roadmap.length - 1;

                              return (
                                <div
                                  key={`${complaint.id}-${item.label}-${timelineIndex}`}
                                  className="relative pl-5"
                                >
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
                                    {formatDateTime(item.time)}
                                  </p>
                                </div>
                              );
                            })}

                            {roadmap.length === 0 && (
                              <p className="text-xs text-muted">No updates yet.</p>
                            )}
                          </div>
                        </div>

                        {isProminent && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {session?.user?.role === "vendor" ? (
                              <Button
                                asChild
                                size="sm"
                                className="inline-flex items-center gap-2 border-accent bg-accent text-surface hover:bg-transparent hover:text-accent text-xs"
                              >
                                <Link href={`/dashboard/vendor/assignments/${complaint.id}`}>
                                  View Details
                                </Link>
                              </Button>
                            ) : (
                              <>
                                {(complaint.status.toLowerCase() === "pending" ||
                                  complaint.status.toLowerCase() === "open") &&
                                  !complaint.assignedTo && (
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

                                {(complaint.status === "Assigned" || complaint.status === "In Progress") &&
                                  complaint.assignedTo && (
                                    <Button
                                      type="button"
                                      onClick={() => setRemindVendor(complaint)}
                                      size="sm"
                                      disabled={!canSendReminder(complaint.id)}
                                      className="inline-flex items-center gap-2 border-blue-500 bg-blue-500 text-surface disabled:cursor-not-allowed disabled:opacity-50 hover:bg-transparent hover:text-blue-500 disabled:hover:bg-blue-500 disabled:hover:text-surface text-xs"
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
                                      {canSendReminder(complaint.id)
                                        ? "Remind"
                                        : `In ${timeRemaining[complaint.id] || "..."}`}
                                    </Button>
                                  )}

                                {complaint.status === "Fixed" && (
                                  <Button
                                    type="button"
                                    onClick={() => handleVerifySolution(complaint)}
                                    size="sm"
                                    className="inline-flex items-center gap-2 border-purple-500 bg-purple-500 text-surface hover:bg-transparent hover:text-purple-500 text-xs"
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="h-4 w-4"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                      <polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                    Verify
                                  </Button>
                                )}
                                {complaint.status === "Fixed" && (
                                  <Button
                                    type="button"
                                    onClick={() => setReportComplaint(complaint)}
                                    size="sm"
                                    className="inline-flex items-center gap-2 border-amber-500 bg-amber-500 text-surface hover:bg-transparent hover:text-amber-500 text-xs"
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
                                    Report
                                  </Button>
                                )}
                              </>
                            )}
                            <Button
                              type="button"
                              onClick={() => handleRefreshComplaint(complaint.id)}
                              disabled={refreshingIds.has(complaint.id)}
                              size="sm"
                              className="inline-flex items-center gap-1.5 border-border bg-surface text-heading hover:bg-surface/80 text-xs"
                            >
                              <svg
                                className={cn(
                                  "h-3.5 w-3.5 text-heading",
                                  refreshingIds.has(complaint.id) && "animate-spin"
                                )}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M21 3v5h-5"
                                />
                              </svg>
                              Refresh
                            </Button>
                          </div>
                        )
                        }
                      </div>
                    </motion.article>
                  );
                })}
              </div>

              {
                cardCount > 1 && (
                  <Button
                    type="button"
                    onClick={handleNext}
                    onMouseEnter={() => setIsNavHovered(true)}
                    onMouseLeave={() => setIsNavHovered(false)}
                    onFocus={() => setIsNavHovered(true)}
                    onBlur={() => setIsNavHovered(false)}
                    variant="outline"
                    size="icon-sm"
                    className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 border-border bg-surface text-heading shadow-xl ring-1 ring-border/70 hover:bg-surface hover:text-heading md:inline-flex"
                  >
                    <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4 text-heading" />
                  </Button>
                )
              }
            </div >
          </div >
        )
        }
      </GlassCard >

      {/* Close confirmation modal */}
      {
        closeConfirm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 px-4">
            <div className="w-full max-w-lg">
              <GlassCard className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-semibold text-heading">Close Complaint</p>
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
        ) : null
      }

      {/* Remind vendor modal */}
      {
        remindVendor ? (
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
        ) : null
      }


      {/* Report issue modal */}
      {
        reportComplaint ? (
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
        ) : null
      }
    </>
  );
}