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
    { label: "Complaints", href: "/dashboard/superadmin/complaints" },
    { label: "Admins", href: "/dashboard/superadmin/admins" },
    { label: "Vendors", href: "/dashboard/superadmin/vendors" },
    { label: "Analytics", href: "/dashboard/superadmin/analytics" },
  ],
};

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
        <p className="text-lg font-semibold text-heading">{roleLabel}</p>
        <nav className="flex flex-col gap-2 text-sm">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={cn(
                  "rounded-xl px-4 py-2 transition",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-body hover:bg-primary/5"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        <p>Poornima College Of Engineering</p>
        <p>NAAC A+ (AUTONOMOUS)</p>
      </div>
    </aside>
  );
}
