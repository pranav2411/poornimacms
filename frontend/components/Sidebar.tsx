"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/role-context";

const navConfig: Record<UserRole, Array<{ label: string; href: string }>> = {
  faculty: [
    { label: "Home", href: "/dashboard/faculty" },
    { label: "New Complaint", href: "/complaints/new" },
    { label: "My Complaints", href: "/dashboard/faculty/complaints" },
  ],
  vendor: [
    { label: "Home", href: "/dashboard/vendor" },
    { label: "Assignments", href: "/dashboard/vendor/assignments" },
  ],
  admin: [
    { label: "Home", href: "/dashboard/admin" },
    { label: "Complaints", href: "/dashboard/admin/complaints" },
  ],
  superadmin: [
    { label: "Home", href: "/dashboard/superadmin" },
    { label: "Users", href: "/dashboard/superadmin/users" },
    { label: "Departments", href: "/dashboard/superadmin/departments" },
    { label: "Complaints", href: "/dashboard/superadmin/complaints" },
    { label: "Analytics", href: "/dashboard/superadmin/analytics" },
    { label: "SOS History", href: "/dashboard/superadmin/sos" },
  ],
};

// Custom SVG Icons with dual-state (Outline/Active vs Jelly/Translucent)
const HomeIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? "url(#jellyHomeGrad)" : "currentColor"}
    strokeWidth={active ? 1.8 : 1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn(
      "transition-all duration-200 group-hover:scale-105 group-hover:text-primary",
      active
        ? "drop-shadow-[0_4px_8px_rgba(59,130,246,0.35)] -translate-y-0.5 scale-105"
        : "text-slate-400"
    )}
  >
    <defs>
      <linearGradient id="jellyHomeGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
    </defs>
    <path
      d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      fill={active ? "url(#jellyHomeGrad)" : "none"}
      fillOpacity={active ? 0.18 : 0}
    />
    <polyline points="9 22 9 12 15 12 15 22" fill="none" />
  </svg>
);

const NewComplaintIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? "url(#jellyNewGrad)" : "currentColor"}
    strokeWidth={active ? 1.8 : 1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn(
      "transition-all duration-200 group-hover:scale-105 group-hover:text-primary",
      active
        ? "drop-shadow-[0_4px_8px_rgba(59,130,246,0.35)] -translate-y-0.5 scale-105"
        : "text-slate-400"
    )}
  >
    <defs>
      <linearGradient id="jellyNewGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
    </defs>
    <circle
      cx="12"
      cy="12"
      r="10"
      fill={active ? "url(#jellyNewGrad)" : "none"}
      fillOpacity={active ? 0.18 : 0}
    />
    <line x1="12" y1="8" x2="12" y2="16" fill="none" />
    <line x1="8" y1="12" x2="16" y2="12" fill="none" />
  </svg>
);

const ComplaintsIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? "url(#jellyComplaintsGrad)" : "currentColor"}
    strokeWidth={active ? 1.8 : 1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn(
      "transition-all duration-200 group-hover:scale-105 group-hover:text-primary",
      active
        ? "drop-shadow-[0_4px_8px_rgba(59,130,246,0.35)] -translate-y-0.5 scale-105"
        : "text-slate-400"
    )}
  >
    <defs>
      <linearGradient id="jellyComplaintsGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
    </defs>
    <path
      d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
      fill={active ? "url(#jellyComplaintsGrad)" : "none"}
      fillOpacity={active ? 0.18 : 0}
    />
    <rect
      x="8"
      y="2"
      width="8"
      height="4"
      rx="1"
      ry="1"
      fill={active ? "url(#jellyComplaintsGrad)" : "none"}
      fillOpacity={active ? 0.25 : 0}
    />
    <line x1="8" y1="11" x2="16" y2="11" fill="none" />
    <line x1="8" y1="16" x2="16" y2="16" fill="none" />
  </svg>
);

const AssignmentsIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? "url(#jellyAssignmentsGrad)" : "currentColor"}
    strokeWidth={active ? 1.8 : 1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn(
      "transition-all duration-200 group-hover:scale-105 group-hover:text-primary",
      active
        ? "drop-shadow-[0_4px_8px_rgba(59,130,246,0.35)] -translate-y-0.5 scale-105"
        : "text-slate-400"
    )}
  >
    <defs>
      <linearGradient id="jellyAssignmentsGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
    </defs>
    <path
      d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
      fill={active ? "url(#jellyAssignmentsGrad)" : "none"}
      fillOpacity={active ? 0.18 : 0}
    />
    <rect
      x="8"
      y="2"
      width="8"
      height="4"
      rx="1"
      ry="1"
      fill={active ? "url(#jellyAssignmentsGrad)" : "none"}
      fillOpacity={active ? 0.25 : 0}
    />
    <path d="m9 14 2 2 4-4" fill="none" />
  </svg>
);

const AdminsIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? "url(#jellyAdminsGrad)" : "currentColor"}
    strokeWidth={active ? 1.8 : 1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn(
      "transition-all duration-200 group-hover:scale-105 group-hover:text-primary",
      active
        ? "drop-shadow-[0_4px_8px_rgba(59,130,246,0.35)] -translate-y-0.5 scale-105"
        : "text-slate-400"
    )}
  >
    <defs>
      <linearGradient id="jellyAdminsGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
    </defs>
    <path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      fill={active ? "url(#jellyAdminsGrad)" : "none"}
      fillOpacity={active ? 0.18 : 0}
    />
    <circle cx="12" cy="11" r="3" fill="none" />
  </svg>
);

const VendorsIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? "url(#jellyVendorsGrad)" : "currentColor"}
    strokeWidth={active ? 1.8 : 1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn(
      "transition-all duration-200 group-hover:scale-105 group-hover:text-primary",
      active
        ? "drop-shadow-[0_4px_8px_rgba(59,130,246,0.35)] -translate-y-0.5 scale-105"
        : "text-slate-400"
    )}
  >
    <defs>
      <linearGradient id="jellyVendorsGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
    </defs>
    <path
      d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
      fill={active ? "url(#jellyVendorsGrad)" : "none"}
      fillOpacity={active ? 0.18 : 0}
    />
    <circle cx="9" cy="7" r="4" fill="none" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" fill="none" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none" />
  </svg>
);

const UsersIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? "url(#jellyUsersGrad)" : "currentColor"}
    strokeWidth={active ? 1.8 : 1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn(
      "transition-all duration-200 group-hover:scale-105 group-hover:text-primary",
      active
        ? "drop-shadow-[0_4px_8px_rgba(59,130,246,0.35)] -translate-y-0.5 scale-105"
        : "text-slate-400"
    )}
  >
    <defs>
      <linearGradient id="jellyUsersGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
    </defs>
    <path
      d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
      fill={active ? "url(#jellyUsersGrad)" : "none"}
      fillOpacity={active ? 0.18 : 0}
    />
    <circle cx="9" cy="7" r="4" fill="none" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" fill="none" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none" />
  </svg>
);

const DepartmentsIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? "url(#jellyDeptsGrad)" : "currentColor"}
    strokeWidth={active ? 1.8 : 1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn(
      "transition-all duration-200 group-hover:scale-105 group-hover:text-primary",
      active
        ? "drop-shadow-[0_4px_8px_rgba(59,130,246,0.35)] -translate-y-0.5 scale-105"
        : "text-slate-400"
    )}
  >
    <defs>
      <linearGradient id="jellyDeptsGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
    </defs>
    <path
      d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"
      fill={active ? "url(#jellyDeptsGrad)" : "none"}
      fillOpacity={active ? 0.18 : 0}
    />
    <path d="M9 21V9" fill="none" />
    <path d="M15 21V9" fill="none" />
    <path d="M3 13h18" fill="none" />
  </svg>
);

const AnalyticsIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? "url(#jellyAnalyticsGrad)" : "currentColor"}
    strokeWidth={active ? 1.8 : 1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn(
      "transition-all duration-200 group-hover:scale-105 group-hover:text-primary",
      active
        ? "drop-shadow-[0_4px_8px_rgba(59,130,246,0.35)] -translate-y-0.5 scale-105"
        : "text-slate-400"
    )}
  >
    <defs>
      <linearGradient id="jellyAnalyticsGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
    </defs>
    <line x1="18" y1="20" x2="18" y2="10" fill="none" />
    <line x1="12" y1="20" x2="12" y2="4" fill="none" />
    <line x1="6" y1="20" x2="6" y2="14" fill="none" />
  </svg>
);

const SosHistoryIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? "url(#jellySosGrad)" : "currentColor"}
    strokeWidth={active ? 1.8 : 1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn(
      "transition-all duration-200 group-hover:scale-105 group-hover:text-rose-500",
      active
        ? "drop-shadow-[0_4px_8px_rgba(239,68,68,0.35)] -translate-y-0.5 scale-105"
        : "text-slate-400"
    )}
  >
    <defs>
      <linearGradient id="jellySosGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#EF4444" />
        <stop offset="100%" stopColor="#DC2626" />
      </linearGradient>
    </defs>
    <path
      d="M12 2L2 22h20L12 2z"
      fill={active ? "url(#jellySosGrad)" : "none"}
      fillOpacity={active ? 0.18 : 0}
    />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

function SidebarIcon({ label, active }: { label: string; active: boolean }) {
  switch (label) {
    case "Home":
      return <HomeIcon active={active} />;
    case "New Complaint":
      return <NewComplaintIcon active={active} />;
    case "My Complaints":
    case "Complaints":
      return <ComplaintsIcon active={active} />;
    case "Assignments":
      return <AssignmentsIcon active={active} />;
    case "Admins":
      return <AdminsIcon active={active} />;
    case "Vendors":
      return <VendorsIcon active={active} />;
    case "Users":
      return <UsersIcon active={active} />;
    case "Departments":
      return <DepartmentsIcon active={active} />;
    case "Analytics":
      return <AnalyticsIcon active={active} />;
    case "SOS History":
      return <SosHistoryIcon active={active} />;
    default:
      return null;
  }
}

export default function Sidebar({
  role,
  className,
}: {
  role: UserRole;
  className?: string;
}) {
  const pathname = usePathname();
  const items = navConfig[role];
  const roleLabel = role === "faculty" ? "Faculty Dashboard" : role;

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col justify-between border-r border-border bg-surface px-6 py-8 text-heading shadow-xl",
        className
      )}
    >
      <div className="flex flex-col gap-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">
          Poornima CMS
        </p>
        <p className="text-lg font-semibold text-heading capitalize">{roleLabel}</p>
        <nav className="flex flex-col gap-2.5 text-sm">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-200 group text-sm",
                  active
                    ? "bg-primary/[0.04] text-primary font-semibold"
                    : "text-body/80 hover:text-primary hover:bg-primary/[0.02] font-normal"
                )}
              >
                <SidebarIcon label={item.label} active={active} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        <p>Poornima College Of Engineering</p>
        <p className="mt-1">NAAC A+ (AUTONOMOUS)</p>
      </div>
    </aside>
  );
}
