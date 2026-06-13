import { cn } from "@/lib/utils";
import type { ComplaintStatus } from "@/lib/types";

const statusStyles: Record<string, string> = {
  pending: "bg-pending/15 text-pending border-pending/30",
  open: "bg-pending/15 text-pending border-pending/30",
  assigned: "bg-assigned/15 text-assigned border-assigned/30",
  vendor_assigned: "bg-assigned/15 text-assigned border-assigned/30",
  "in progress": "bg-accent/15 text-accent border-accent/30",
  in_progress: "bg-accent/15 text-accent border-accent/30",
  fixed: "bg-fixed/15 text-fixed border-fixed/30",
  done: "bg-fixed/15 text-fixed border-fixed/30",
  closed: "bg-closed/20 text-closed border-closed/30",
  resolved: "bg-closed/20 text-closed border-closed/30",
  cancelled: "bg-closed/20 text-closed border-closed/30",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  open: "Open",
  assigned: "Assigned",
  vendor_assigned: "Assigned",
  "in progress": "In Progress",
  in_progress: "In Progress",
  fixed: "Fixed",
  done: "Fixed",
  closed: "Closed",
  resolved: "Closed",
  cancelled: "Closed",
};

export default function StatusPill({
  status,
  className,
}: {
  status: ComplaintStatus;
  className?: string;
}) {
  const normalizedKey = (status || "").toLowerCase();
  const styleClass = statusStyles[normalizedKey] || "bg-pending/15 text-pending border-pending/30";
  const label = statusLabels[normalizedKey] || status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        styleClass,
        className
      )}
    >
      {label}
    </span>
  );
}
