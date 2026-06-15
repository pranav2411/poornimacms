"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { getReports } from "@/lib/api";
import type { ReportItem } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/lib/toast";

export default function AdminReportsPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (session === undefined) return;
    let isMounted = true;

    const loadReports = async () => {
      try {
        setIsLoading(true);
        const data = await getReports({
          userId: session?.user?.id || "",
          role: "admin",
        });

        if (!isMounted) return;
        setReports(data);
        setIsLoading(false);
      } catch (error) {
        if (!isMounted) return;
        setIsLoading(false);
        addToast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load reports.",
          variant: "destructive",
        });
      }
    };

    loadReports();
    return () => {
      isMounted = false;
    };
  }, [session, addToast]);

  const filteredReports = reports.filter((r) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesComplaintNo = r.complaintNo.toLowerCase().includes(q);
      const matchesTitle = r.title.toLowerCase().includes(q);
      const matchesReporter = r.reportedBy.toLowerCase().includes(q);
      const matchesVendor = r.vendorName.toLowerCase().includes(q);
      const matchesReason = r.reason.toLowerCase().includes(q);
      const matchesDetails = (r.details || "").toLowerCase().includes(q);

      return (
        matchesComplaintNo ||
        matchesTitle ||
        matchesReporter ||
        matchesVendor ||
        matchesReason ||
        matchesDetails
      );
    }
    return true;
  });

  return (
    <DashboardShell
      role="admin"
      title="Assigned Reports"
      subtitle="Track incomplete work on vendor jobs assigned by you"
      userName={session?.user?.name || "Admin"}
      avatarUrl={session?.user?.image || "/user-no-av.png"}
    >
      <div className="space-y-6">
        {/* Summary Card */}
        <div className="grid gap-4 md:grid-cols-2">
          <GlassCard className="p-5 flex flex-col justify-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Total Active Reports</span>
            <span className="text-3xl font-extrabold text-heading mt-2 font-mono">{reports.length}</span>
          </GlassCard>
          <GlassCard className="p-5 flex flex-col justify-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Matching Search</span>
            <span className="text-3xl font-extrabold text-heading mt-2 font-mono">{filteredReports.length}</span>
          </GlassCard>
        </div>

        {/* Search Row */}
        <GlassCard className="p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search reports by complaint ID, title, vendor or reporter name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-border bg-surface/50 pl-10 pr-4 py-2.5 text-sm text-heading outline-none focus:border-primary focus:bg-surface transition-all duration-200"
            />
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </GlassCard>

        {/* Reports Table/Card List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div key={idx} className="h-32 rounded-3xl border border-border bg-surface/50 animate-pulse" />
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface/50 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="mt-4 text-base font-semibold text-heading font-jakarta">No reports found</p>
            <p className="mt-2 text-sm text-muted">There are no reports submitted on jobs assigned by you.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredReports.map((report) => (
              <GlassCard
                key={report.id}
                className="p-6 border border-border/60 bg-surface/40 hover:bg-surface/60 transition-all duration-300 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.03),transparent_40%)]" />
                <div className="space-y-3 max-w-3xl relative">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xs font-mono bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded-md font-semibold">
                      {report.complaintNo}
                    </span>
                    <span className="text-xs text-muted font-medium">
                      Reported on {formatDateTime(report.createdAt)}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-semibold text-heading truncate">{report.departmentName}</span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-heading leading-tight">{report.title}</h3>
                    <p className="text-sm font-semibold text-amber-600 mt-1.5 flex items-center gap-1.5">
                      <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Reason: {report.reason}
                    </p>
                    {report.details && (
                      <p className="text-xs text-body leading-relaxed bg-surface/30 border border-border/30 rounded-xl p-3 mt-2 font-medium">
                        "{report.details}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-2xs text-muted font-medium pt-1 border-t border-border/20">
                    <span>
                      Faculty: <strong className="text-body font-semibold">{report.reportedBy}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Vendor: <strong className="text-body font-semibold">{report.vendorName}</strong>
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3 relative self-end md:self-auto">
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-full text-xs font-semibold border-border bg-transparent hover:bg-surface px-5 h-10 shadow-sm"
                  >
                    <Link href={`/dashboard/admin/complaints/${report.complaintNo}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
