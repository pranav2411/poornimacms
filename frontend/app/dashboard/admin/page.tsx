"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import AssignVendorModal from "@/components/AssignVendorModal";
import { Button } from "@/components/ui/button";
import { assignVendor, getComplaints, getVendors } from "@/lib/api";
import type { Complaint, VendorItem } from "@/lib/types";
import { useToast } from "@/lib/toast";
import { cn, formatDateTime } from "@/lib/utils";

const priorityStyles: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  medium: "bg-pending/15 text-pending border-pending/30",
  high: "bg-red-500/15 text-red-500 border-red-500/30",
};

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  const isSuperadmin = session?.user?.role === "superadmin";
  const adminDeptId = isSuperadmin ? undefined : (session?.user?.departmentId || undefined);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [complaintsData, vendorsData] = await Promise.all([
        getComplaints({ departmentId: adminDeptId }),
        getVendors({ departmentId: adminDeptId }),
      ]);
      setComplaints(complaintsData);
      setVendors(vendorsData);
    } catch (error) {
      setComplaints([]);
      setVendors([]);
      addToast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [adminDeptId, addToast]);

  useEffect(() => {
    if (session === undefined) return;
    loadData();
  }, [session, loadData]);

  const handleAssignClick = (complaintId: string) => {
    setSelectedComplaintId(complaintId);
    setOpenModal(true);
  };

  const handleAssignSubmit = async (vendorName: string) => {
    if (!selectedComplaintId) return;
    try {
      const updated = await assignVendor(selectedComplaintId, vendorName);
      setComplaints((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
      );
      addToast({
        title: "Vendor Assigned",
        description: `Successfully assigned ${vendorName} to complaint ${selectedComplaintId}.`,
      });
      setOpenModal(false);
      setSelectedComplaintId(null);
    } catch (error) {
      addToast({
        title: "Assignment Failed",
        description: error instanceof Error ? error.message : "Failed to assign vendor.",
        variant: "destructive",
      });
    }
  };

  // Filter complaints
  const unassigned = complaints.filter(
    (item) => !item.assignedTo && item.status !== "Closed"
  );
  const assigned = complaints.filter(
    (item) => item.assignedTo && item.status !== "Closed"
  );

  return (
    <DashboardShell
      role="admin"
      title="Admin Dashboard"
      subtitle={isSuperadmin ? "Monitor all institution complaints" : "Monitor your department complaints"}
      userName={session?.user?.name || "Admin"}
      avatarUrl={session?.user?.image || "/user-no-av.png"}
      headerActions={
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
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
      <div className="grid gap-8">
        {/* Unassigned Complaints Section */}
        <div>
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                Immediate Action Required
              </p>
              <h2 className="text-xl font-bold text-heading font-jakarta mt-1">
                Unassigned Complaints
              </h2>
            </div>
            <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-500">
              {unassigned.length} Pending
            </span>
          </div>

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={`unassigned-skeleton-${idx}`}
                  className="rounded-3xl border border-border bg-surface/50 p-6 animate-pulse h-48"
                />
              ))}
            </div>
          ) : unassigned.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface/50 p-10 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-emerald-500 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-base font-semibold text-heading font-jakarta">
                All caught up!
              </p>
              <p className="text-sm text-muted mt-1">
                No unassigned complaints in your category.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
              {unassigned.map((item) => (
                <article
                  key={item.id}
                  className="group relative overflow-hidden rounded-[2rem] border border-primary/40 bg-surface shadow-[0_20px_50px_rgba(26,63,170,0.08)] backdrop-blur-md transition-all duration-300 hover:scale-[1.01] hover:shadow-lg flex flex-col"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(26,63,170,0.04),transparent_48%)]" />
                  <div className="relative flex flex-col gap-3 p-5 md:p-6 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                          {item.id}
                        </p>
                        <h3 className="mt-2 text-base font-semibold text-heading line-clamp-1">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-xs text-muted">
                          Room {item.room} · {item.category}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-2xs font-medium ${
                          priorityStyles[item.priority?.toLowerCase()] ||
                          "bg-muted/15 text-muted border-muted/30"
                        }`}
                      >
                        {item.priority?.charAt(0).toUpperCase() +
                          item.priority?.slice(1).toLowerCase()}
                      </span>
                    </div>

                    <p className="text-xs leading-5 text-body line-clamp-2 h-10">
                      {item.description}
                    </p>

                    <div className="flex-1 overflow-y-auto rounded-2xl border border-border/80 bg-surface/70 p-3 backdrop-blur-sm min-h-[110px] max-h-[130px] scrollbar-none">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                        Roadmap
                      </p>
                      <div className="mt-2 space-y-2.5">
                        {(item.timeline ?? []).map((step, timelineIndex) => {
                          const isLast = timelineIndex === (item.timeline ?? []).length - 1;
                          return (
                            <div
                              key={`${item.id}-${step.label}-${timelineIndex}`}
                              className="relative pl-5"
                            >
                              <span
                                className={`absolute left-[0.2rem] top-2 h-2 w-2 rounded-full border border-surface ${
                                  timelineIndex === 0 ? "bg-primary" : "bg-accent"
                                }`}
                              />
                              {!isLast && (
                                <span className="absolute left-[0.45rem] top-3 h-[calc(100%+0.5rem)] w-px bg-border" />
                              )}
                              <p className="text-3xs font-medium text-heading">{step.label}</p>
                              <p className="mt-0.5 text-[0.5rem] uppercase tracking-[0.16em] text-muted">
                                {formatDateTime(step.time).split(" ")[0]}
                              </p>
                            </div>
                          );
                        })}

                        {(item.timeline ?? []).length === 0 && (
                          <p className="text-3xs text-muted">No updates yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2 mt-auto">
                      <Button
                        asChild
                        variant="outline"
                        className="flex-1 rounded-full border border-border hover:bg-surface text-2xs font-semibold py-1.5 h-9"
                      >
                        <Link href={`/dashboard/admin/complaints/${item.id}`}>
                          View Details
                        </Link>
                      </Button>
                      <Button
                        onClick={() => handleAssignClick(item.id)}
                        className="flex-1 rounded-full border border-primary bg-primary text-white hover:bg-transparent hover:text-primary transition-all duration-200 text-2xs font-semibold py-1.5 h-9"
                      >
                        Assign Vendor
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Assigned queue Section */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-heading font-jakarta">Assigned queue</h2>
          <p className="text-sm text-muted">
            Track resolutions and update assignments for vendors already in progress.
          </p>

          {isLoading ? (
            <div className="mt-4 grid gap-3">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div
                  key={`assigned-skeleton-${idx}`}
                  className="rounded-2xl border border-border bg-surface/50 p-4 animate-pulse h-16"
                />
              ))}
            </div>
          ) : assigned.length === 0 ? (
            <p className="text-sm text-muted mt-4 text-center py-6 border border-dashed border-border rounded-2xl">
              No assigned complaints currently in progress.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {assigned.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/70 p-4 md:flex-row md:items-center md:justify-between hover:bg-surface/90 transition-all duration-200"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/admin/complaints/${item.id}`}
                        className="text-sm font-semibold text-heading hover:text-primary hover:underline"
                      >
                        {item.title}
                      </Link>
                      <span className="text-[10px] font-mono text-muted">{item.id}</span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {item.room} - {item.category} · Assigned to:{" "}
                      <strong className="text-body font-semibold">{item.assignedTo}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 self-end md:self-auto">
                    <StatusPill status={item.status} />
                    {item.status !== "Fixed" && item.status !== "Closed" && (
                      <Button
                        variant="outline"
                        onClick={() => handleAssignClick(item.id)}
                        className="rounded-full text-2xs py-1 h-7 border-border hover:bg-surface"
                      >
                        Reassign
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <AssignVendorModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          setSelectedComplaintId(null);
        }}
        vendors={vendors.map((item) => item.name)}
        onAssign={handleAssignSubmit}
      />
    </DashboardShell>
  );
}
