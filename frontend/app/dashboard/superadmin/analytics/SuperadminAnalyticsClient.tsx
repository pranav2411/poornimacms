"use client";

import { useState } from "react";
import GlassCard from "@/components/GlassCard";
import StatsCharts from "@/components/StatsCharts";
import { getStats } from "@/lib/api";

type OptionItem = {
  id: string;
  name: string;
};

type StatsData = {
  stats: Array<{ label: string; value: number }>;
  avgResolutionTime?: number;
};

type SuperadminAnalyticsClientProps = {
  initialStatsResult: StatsData;
  departments: OptionItem[];
  vendors: OptionItem[];
};

export default function SuperadminAnalyticsClient({
  initialStatsResult,
  departments = [],
  vendors = [],
}: SuperadminAnalyticsClientProps) {
  const [statsResult, setStatsResult] = useState<StatsData>(initialStatsResult);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFilterChange = async (deptId: string, vendorId: string) => {
    setSelectedDept(deptId);
    setSelectedVendor(vendorId);
    setLoading(true);
    try {
      const data = await getStats({
        departmentId: deptId || undefined,
        assignedVendorId: vendorId || undefined,
      });
      setStatsResult(data);
    } catch (error) {
      console.error("Failed to fetch filtered stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = statsResult.stats || [];
  const avgResolutionTime = statsResult.avgResolutionTime;
  const hasAnalyticsData = stats.some((item) => item.value > 0);

  const activeCount = stats.find((s) => s.label === "Active Complaints")?.value || 0;
  const resolvedCount = stats.find((s) => s.label === "Resolved")?.value || 0;
  const totalComplaints = activeCount + resolvedCount;

  return (
    <div className="grid gap-6">
      {/* Filters Card */}
      <GlassCard className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-heading font-jakarta">Filters</h2>
            <p className="text-xs text-muted">Filter campus metrics by department or assigned vendor</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Department Filter */}
            <div className="relative min-w-[180px]">
              <select
                value={selectedDept}
                onChange={(e) => handleFilterChange(e.target.value, selectedVendor)}
                disabled={loading}
                className="w-full rounded-2xl border border-border bg-surface/50 pl-4 pr-10 py-2.5 text-xs text-body font-semibold outline-none focus:border-primary focus:bg-surface cursor-pointer appearance-none transition-all duration-200"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Vendor Filter */}
            <div className="relative min-w-[180px]">
              <select
                value={selectedVendor}
                onChange={(e) => handleFilterChange(selectedDept, e.target.value)}
                disabled={loading}
                className="w-full rounded-2xl border border-border bg-surface/50 pl-4 pr-10 py-2.5 text-xs text-body font-semibold outline-none focus:border-primary focus:bg-surface cursor-pointer appearance-none transition-all duration-200"
              >
                <option value="">All Vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* KPI Cards */}
      {hasAnalyticsData && !loading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <GlassCard className="p-6 flex flex-col justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Complaints</p>
            <h3 className="text-3xl font-bold text-heading mt-2">{totalComplaints}</h3>
          </GlassCard>
          <GlassCard className="p-6 flex flex-col justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Active Complaints</p>
            <h3 className="text-3xl font-bold text-blue-500 mt-2">{activeCount}</h3>
          </GlassCard>
          <GlassCard className="p-6 flex flex-col justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Resolved Complaints</p>
            <h3 className="text-3xl font-bold text-emerald-500 mt-2">{resolvedCount}</h3>
          </GlassCard>
          <GlassCard className="p-6 flex flex-col justify-between border-rose-500/20 bg-rose-500/[0.02]">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-500">Avg Resolution Time</p>
            <h3 className="text-3xl font-bold text-rose-500 mt-2">
              {avgResolutionTime && avgResolutionTime > 0 ? `${avgResolutionTime} hrs` : "N/A"}
            </h3>
          </GlassCard>
        </div>
      )}

      {/* Charts Display */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-muted font-medium animate-pulse">Loading analytics data...</div>
        </div>
      ) : hasAnalyticsData ? (
        <StatsCharts stats={stats} />
      ) : (
        <GlassCard className="p-10 text-center">
          <p className="text-base font-semibold text-heading">
            No analytical data available for the selected filters
          </p>
          <p className="mt-2 text-sm text-muted">
            Try choosing a different department or vendor.
          </p>
        </GlassCard>
      )}
    </div>
  );
}
