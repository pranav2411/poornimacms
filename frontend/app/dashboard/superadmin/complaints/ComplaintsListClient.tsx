"use client";

import { useState } from "react";
import Link from "next/link";
import StatusPill from "@/components/StatusPill";
import type { Complaint } from "@/lib/types";

interface ComplaintsListClientProps {
  initialComplaints: Complaint[];
  departments: string[];
}

function normalizeStatus(status?: string): string {
  const s = (status || "").toLowerCase();
  if (s === "open" || s === "pending") return "open";
  if (s === "vendor_assigned" || s === "assigned") return "assigned";
  if (s === "in_progress" || s === "in progress") return "in_progress";
  if (s === "done" || s === "fixed") return "fixed";
  if (s === "resolved" || s === "closed" || s === "cancelled") return "closed";
  return s;
}

export default function ComplaintsListClient({
  initialComplaints,
  departments = [],
}: ComplaintsListClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  // Get a unique list of departments merged from supabase and complaints data
  const allDepts = Array.from(
    new Set([
      ...departments,
      ...(initialComplaints.map((c) => c.category).filter(Boolean) as string[]),
    ])
  ).sort();

  // Filter complaints dynamically
  const filteredComplaints = initialComplaints.filter((item) => {
    // 1. Search filter: Match complaint name/title, creator name, or room number
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const titleMatches = (item.title || "").toLowerCase().includes(query);
      const creatorMatches = (item.createdByName || "Faculty User")
        .toLowerCase()
        .includes(query);
      const roomMatches = (item.room || "").toLowerCase().includes(query);

      if (!titleMatches && !creatorMatches && !roomMatches) {
        return false;
      }
    }

    // 2. Status filter
    if (statusFilter !== "") {
      if (normalizeStatus(item.status) !== statusFilter) {
        return false;
      }
    }

    // 3. Department filter (mapped to complaint category)
    if (deptFilter !== "" && item.category !== deptFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="grid gap-4">
      {/* Search and Filters controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/40 pb-5">
        {/* Search box */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg
              className="h-4.5 w-4.5 text-muted"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name, room, or creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-border bg-surface/50 pl-10 pr-4 py-2.5 text-sm text-heading outline-none focus:border-primary focus:bg-surface transition-all duration-200"
          />
        </div>

        {/* Filters dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="relative min-w-[150px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-2xl border border-border bg-surface/50 pl-4 pr-10 py-2.5 text-xs text-body font-semibold outline-none focus:border-primary focus:bg-surface cursor-pointer appearance-none transition-all duration-200"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="fixed">Fixed</option>
              <option value="closed">Closed</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 text-muted"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Department Filter */}
          <div className="relative min-w-[170px]">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full rounded-2xl border border-border bg-surface/50 pl-4 pr-10 py-2.5 text-xs text-body font-semibold outline-none focus:border-primary focus:bg-surface cursor-pointer appearance-none transition-all duration-200"
            >
              <option value="">All Departments</option>
              {allDepts.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 text-muted"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Complaints Grid List */}
      <div className="grid gap-3">
        <div className="grid grid-cols-7 gap-2 border-b border-border pb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted px-2">
          <span>ID</span>
          <span>Room</span>
          <span>Category</span>
          <span>Status</span>
          <span>Assigned</span>
          <span>Creator</span>
          <span className="text-right">Actions</span>
        </div>

        {filteredComplaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-muted bg-surface/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-muted/60 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-semibold text-heading">No complaints match your filters</p>
            <p className="text-xs text-muted mt-1">Try adjusting your search query or dropdown options.</p>
          </div>
        ) : (
          filteredComplaints.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-7 gap-2 text-sm text-body items-center py-2 hover:bg-surface/30 px-2 rounded-xl transition-all duration-150"
            >
              <span
                className="font-medium text-heading font-mono text-xs truncate"
                title={item.id}
              >
                {item.id}
              </span>
              <span className="font-mono text-heading">{item.room}</span>
              <span>{item.category}</span>
              <div>
                <StatusPill status={item.status} />
              </div>
              <span>{item.assignedTo ?? "Unassigned"}</span>
              <span className="truncate" title={item.createdByName}>
                {item.createdByName || "Faculty User"}
              </span>
              <div className="text-right">
                <Link
                  href={`/dashboard/superadmin/complaints/${item.id}`}
                  className="inline-flex rounded-full border border-primary bg-primary text-white hover:bg-transparent hover:text-primary text-2xs font-semibold py-1.5 px-4.5 shadow-sm transition-all duration-200"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
