"use client";

import { useState } from "react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast";
import { resolveSosAlert } from "@/lib/api";
import type { SosAlertHistoryItem } from "@/lib/api";

export default function SosHistoryClient({
  initialAlerts,
}: {
  initialAlerts: SosAlertHistoryItem[];
}) {
  const [alerts, setAlerts] = useState<SosAlertHistoryItem[]>(initialAlerts);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const { addToast } = useToast();

  const handleResolve = async (alertId: string) => {
    setResolvingId(alertId);
    try {
      const res = await resolveSosAlert(alertId);
      if (res.status !== "success") {
        throw new Error("Failed to resolve alert");
      }

      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, status: "resolved", closedAt: new Date().toISOString() }
            : a
        )
      );

      addToast({
        title: "SOS Alert Resolved",
        description: "The emergency alert status has been updated to resolved.",
        variant: "default",
      });
    } catch (err) {
      addToast({
        title: "Error resolving alert",
        description: err instanceof Error ? err.message : "Operation failed.",
        variant: "destructive",
      });
    } finally {
      setResolvingId(null);
    }
  };

  const getEmergencyDetails = (msg?: string | null) => {
    if (!msg) return { type: "SOS", description: "Emergency alert triggered" };
    const match = msg.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
      return { type: match[1].toUpperCase(), description: match[2] };
    }
    return { type: "EMERGENCY", description: msg };
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "MEDICAL":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50";
      case "FIRE":
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50";
      case "SECURITY":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50";
      default:
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50";
    }
  };

  const filtered = alerts.filter((alert) => {
    const matchesStatus = statusFilter === "all" || alert.status === statusFilter;
    const nameMatch = alert.triggeredByName.toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = alert.triggeredByEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const locationMatch = (alert.location || "").toLowerCase().includes(searchQuery.toLowerCase());
    const messageMatch = (alert.message || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && (nameMatch || emailMatch || locationMatch || messageMatch);
  });

  return (
    <div className="grid gap-6">
      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, location, or details..."
            className="w-full rounded-2xl border border-border bg-surface pl-10 pr-4 py-2.5 text-sm text-heading outline-none focus:border-primary transition-all duration-200"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-body outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">All Alerts</option>
            <option value="active">Active Alerts</option>
            <option value="resolved">Resolved Alerts</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-muted bg-surface/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-muted/50 mb-2"
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
            <p className="text-sm font-semibold text-heading">No SOS alerts found</p>
            <p className="text-xs text-muted">No emergency panic signals match the search filters.</p>
          </div>
        ) : (
          filtered.map((alert) => {
            const details = getEmergencyDetails(alert.message);
            const isActive = alert.status === "active";

            return (
              <GlassCard
                key={alert.id}
                className={`p-6 border transition-all duration-200 ${
                  isActive
                    ? "border-red-200 bg-red-50/5 dark:border-red-900/30 dark:bg-red-950/5"
                    : "border-border bg-surface/70"
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-bold border uppercase tracking-wider ${getBadgeColor(
                          details.type
                        )}`}
                      >
                        {details.type}
                      </span>

                      <span className="text-xs text-muted font-mono">
                        {new Date(alert.createdAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>

                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 dark:bg-red-900/40 px-2 py-0.5 text-2xs font-semibold text-red-700 dark:text-red-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-600 dark:bg-red-500 animate-pulse" />
                          ACTIVE EMERGENCY
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-2xs font-semibold text-slate-700 dark:text-slate-400">
                          Resolved
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-heading mt-3">
                      {details.description || "No description provided"}
                    </h3>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2 text-xs text-muted">
                      <div>
                        <span className="block text-2xs uppercase tracking-wider text-muted/80">Triggered By</span>
                        <strong className="text-body font-semibold text-sm">
                          {alert.triggeredByName}
                        </strong>
                        <span className="block text-2xs font-mono">{alert.triggeredByEmail}</span>
                      </div>
                      <div>
                        <span className="block text-2xs uppercase tracking-wider text-muted/80">Location</span>
                        <strong className="text-body font-semibold text-sm">
                          {alert.location || "Unknown Location"}
                        </strong>
                      </div>
                    </div>

                    {!isActive && alert.closedAt && (
                      <p className="text-2xs text-muted mt-3 italic">
                        Resolved at {new Date(alert.closedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {isActive && (
                    <div className="flex items-center justify-end mt-2 md:mt-0">
                      <Button
                        onClick={() => handleResolve(alert.id)}
                        disabled={resolvingId === alert.id}
                        className="rounded-full bg-rose-600 hover:bg-transparent text-white hover:text-rose-600 border border-rose-600 shadow-md text-xs font-semibold py-2 px-5 transition-all duration-200"
                      >
                        {resolvingId === alert.id ? "Resolving..." : "Mark Resolved"}
                      </Button>
                    </div>
                  )}
                </div>
              </GlassCard>
            );
          })
        )}
      </div>
    </div>
  );
}
