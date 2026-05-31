import { cn } from "@/lib/utils";
import type { ComplaintStatus } from "@/lib/mockData";

const statusStyles: Record<ComplaintStatus, string> = {
  Pending: "bg-pending/15 text-pending border-pending/30",
  Assigned: "bg-assigned/15 text-assigned border-assigned/30",
  "In Progress": "bg-accent/15 text-accent border-accent/30",
  Fixed: "bg-fixed/15 text-fixed border-fixed/30",
  Closed: "bg-closed/20 text-closed border-closed/30",
};

export default function StatusPill({
  status,
  className,
}: {
  status: ComplaintStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        statusStyles[status],
        className
      )}
    >
      {status}
    </span>
  );
}
