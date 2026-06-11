"use client";

import { useState } from "react";
import Link from "next/link";
import StatusPill from "@/components/StatusPill";
import type { Complaint } from "@/lib/types";

export default function UnassignedComplaintsClient({
  initialComplaints,
  existingDepartments = [],
}: {
  initialComplaints: Complaint[];
  existingDepartments?: string[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "priority-high" | "priority-low">("newest");

  // Get unique list of departments dynamically merged from system settings and data
  const allDepts = Array.from(
    new Set([
      ...existingDepartments,
      ...(initialComplaints.map((c) => c.category).filter(Boolean) as string[]),
    ])
  ).sort();

  // Filter logic
  const filtered = initialComplaints.filter((item) => {
    if (searchQuery === "") return true;
    return (item.category || "").toLowerCase() === searchQuery.toLowerCase();
  });

  // Sort logic
  const priorityRank = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return 3;
      case "medium":
        return 2;
      case "low":
        return 1;
      default:
        return 0;
    }
  };

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === "oldest") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortBy === "priority-high") {
      const pDiff = priorityRank(b.priority) - priorityRank(a.priority);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === "priority-low") {
      const pDiff = priorityRank(a.priority) - priorityRank(b.priority);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });

  const getPriorityLabel = (priority?: string) => {
    if (!priority) return "";
    return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
  };

  return (
    <div className="grid gap-4">
      {/* Search and Sort controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
        <div className="relative flex-1 max-w-xs">
          <select
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-xs text-heading outline-none focus:border-primary cursor-pointer transition-all duration-200"
          >
            <option value="">All Departments</option>
            {allDepts.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-2xs font-semibold text-muted uppercase tracking-wider">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-2xl border border-border bg-surface px-3 py-1.5 text-xs text-body outline-none focus:border-primary cursor-pointer transition-all duration-200"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priority-high">Priority: High to Low</option>
            <option value="priority-low">Priority: Low to High</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 mt-1">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-10 text-muted bg-surface/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-muted/60 mb-2"
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
            <p className="text-sm font-semibold text-heading">No complaints found</p>
            <p className="text-xs text-muted">No unassigned complaints match your department query.</p>
          </div>
        ) : (
          sorted.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-surface/70 p-5 md:flex-row md:items-center md:justify-between hover:bg-surface/90 transition-all duration-200"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
                    {item.id}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-bold ${
                      item.priority?.toLowerCase() === "high"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : item.priority?.toLowerCase() === "medium"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {getPriorityLabel(item.priority)}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-heading mt-2">{item.title}</h3>
                
                <div className="flex items-center gap-4 mt-3 text-2xs text-muted">
                  <span>Room: <strong className="text-body font-medium">{item.room}</strong></span>
                  <span>Category: <strong className="text-body font-medium">{item.category}</strong></span>
                  <span>Made by: <strong className="text-body font-medium">{item.createdByName || "Faculty User"}</strong></span>
                </div>
              </div>
              
              <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                <StatusPill status={item.status} />
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Link
                    href={`/dashboard/superadmin/complaints/${item.id}`}
                    className="rounded-full border border-primary/20 bg-transparent text-primary hover:bg-primary/5 text-xs font-semibold py-2 px-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
                  >
                    View Details
                  </Link>
                  <Link
                    href={`/dashboard/superadmin/complaints/${item.id}?assign=true`}
                    className="rounded-full border border-primary bg-primary text-white hover:bg-transparent hover:text-primary text-xs font-semibold py-2 px-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
                  >
                    Assign Vendor
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
