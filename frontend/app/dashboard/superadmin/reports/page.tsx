"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { getReports, getVendors } from "@/lib/api";
import type { ReportItem, VendorItem } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/lib/toast";

export default function SuperadminReportsPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");

  useEffect(() => {
    if (session === undefined) return;
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        // Fetch reports, departments, and vendors in parallel
        const [reportsData, vendorsData, deptRes] = await Promise.all([
          getReports({ userId: session?.user?.id || "", role: "superadmin" }),
          getVendors(),
          fetch("/api/departments")
        ]);

        let deptData = [];
        if (deptRes.ok) {
          deptData = await deptRes.json();
        }

        if (!isMounted) return;

        setReports(reportsData);
        setVendors(vendorsData);
        setDepartments(deptData);
        setIsLoading(false);
      } catch (error) {
        if (!isMounted) return;
        setIsLoading(false);
        addToast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load reports data.",
          variant: "destructive",
        });
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [session, addToast]);

  // Client-side filtering
  const filteredReports = reports.filter((r) => {
    // 1. Department filter
    if (selectedDeptId && r.departmentId !== selectedDeptId) return false;
    
    // 2. Vendor filter
    if (selectedVendorId && r.vendorId !== selectedVendorId) return false;

    // 3. Search query (supports vendor name filter as well)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesComplaintNo = r.complaintNo.toLowerCase().includes(q);
      const matchesTitle = r.title.toLowerCase().includes(q);
      const matchesReporter = r.reportedBy.toLowerCase().includes(q);
      const matchesVendor = r.vendorName.toLowerCase().includes(q);
      const matchesReason = r.reason.toLowerCase().includes(q);
      const matchesDetails = (r.details || "").toLowerCase().includes(q);
      const matchesDept = r.departmentName.toLowerCase().includes(q);

      return (
        matchesComplaintNo ||
        matchesTitle ||
        matchesReporter ||
        matchesVendor ||
        matchesReason ||
        matchesDetails ||
        matchesDept
      );
    }
    return true;
  });

  return (
    <DashboardShell
      role="superadmin"
      title="Reports Center"
      subtitle="Institutional trace of incomplete work reports"
      userName={session?.user?.name || "Chief Admin"}
      avatarUrl={session?.user?.image || "/user-no-av.png"}
    >
      <div className="space-y-6">
        {/* Header Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <GlassCard className="p-5 flex flex-col justify-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Total Reports Filed</span>
            <span className="text-3xl font-extrabold text-heading mt-2 font-mono">{reports.length}</span>
          </GlassCard>
          <GlassCard className="p-5 flex flex-col justify-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Filtered Reports</span>
            <span className="text-3xl font-extrabold text-heading mt-2 font-mono">{filteredReports.length}</span>
          </GlassCard>
          <GlassCard className="p-5 flex flex-col justify-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Departments Affected</span>
            <span className="text-3xl font-extrabold text-heading mt-2 font-mono">
              {new Set(reports.map(r => r.departmentId)).size}
            </span>
          </GlassCard>
        </div>

        {/* Filter Controls Row */}
        <GlassCard className="p-6">
          <div className="grid gap-4 md:grid-cols-12 items-end">
            {/* Search Input */}
            <div className="md:col-span-5 space-y-2">
              <label htmlFor="search" className="text-xs font-semibold uppercase tracking-wider text-muted block">
                Search Reports
              </label>
              <div className="relative">
                <input
                  id="search"
                  type="text"
                  placeholder="Search by complaint, vendor, reporter..."
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
            </div>

            {/* Department Select */}
            <div className="md:col-span-3 space-y-2">
              <label htmlFor="department" className="text-xs font-semibold uppercase tracking-wider text-muted block">
                Filter by Department
              </label>
              <select
                id="department"
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full rounded-2xl border border-border bg-surface/50 px-4 py-2.5 text-sm text-heading outline-none focus:border-primary focus:bg-surface transition-all duration-200"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendor Select */}
            <div className="md:col-span-3 space-y-2">
              <label htmlFor="vendor" className="text-xs font-semibold uppercase tracking-wider text-muted block">
                Filter by Vendor
              </label>
              <select
                id="vendor"
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full rounded-2xl border border-border bg-surface/50 px-4 py-2.5 text-sm text-heading outline-none focus:border-primary focus:bg-surface transition-all duration-200"
              >
                <option value="">All Vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            <div className="md:col-span-1">
              <Button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedDeptId("");
                  setSelectedVendorId("");
                }}
                variant="outline"
                className="w-full rounded-2xl border-border py-2.5 h-10 flex items-center justify-center text-xs"
                title="Clear Filters"
              >
                Reset
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Reports Grid/Table */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
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
            <p className="mt-2 text-sm text-muted">No incomplete work reports match your search query or filters.</p>
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
                      Vendor Assigned: <strong className="text-body font-semibold">{report.vendorName}</strong>
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3 relative self-end md:self-auto">
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-full text-xs font-semibold border-border bg-transparent hover:bg-surface px-5 h-10 shadow-sm"
                  >
                    <Link href={`/dashboard/superadmin/complaints/${report.complaintNo}`}>
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
