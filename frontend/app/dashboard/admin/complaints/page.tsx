"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import StatusPill from "@/components/StatusPill";
import AssignVendorModal from "@/components/AssignVendorModal";
import { Button } from "@/components/ui/button";
import { assignVendor, getComplaints, getVendors } from "@/lib/api";
import type { Complaint, VendorItem } from "@/lib/types";

export default function AdminComplaintsPage() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [selected, setSelected] = useState("");

  const isSuperadmin = session?.user?.role === "superadmin";
  const adminDeptId = isSuperadmin ? undefined : (session?.user?.departmentId || undefined);

  useEffect(() => {
    if (session === undefined) return;
    let isMounted = true;

    const loadData = async () => {
      try {
        const [complaintsData, vendorsData] = await Promise.all([
          getComplaints({ departmentId: adminDeptId }),
          getVendors({ departmentId: adminDeptId }),
        ]);
        if (!isMounted) return;
        setComplaints(complaintsData);
        setVendors(vendorsData);
        setSelected((prev) => prev || complaintsData[0]?.id || "");
      } catch {
        if (!isMounted) return;
        setComplaints([]);
        setVendors([]);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [session, adminDeptId]);

  const handleAssign = async (vendor: string) => {
    if (!selected) return;
    try {
      const updated = await assignVendor(selected, vendor);
      setComplaints((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setOpen(false);
    } catch {
      setOpen(false);
    }
  };

  return (
    <DashboardShell
      role="admin"
      title="Complaints"
      subtitle={isSuperadmin ? "Assign vendors and track timelines institution-wide" : "Assign vendors and track timelines"}
      userName={session?.user?.name || "Admin Desk"}
      avatarUrl={session?.user?.image || "/avatar-placeholder.svg"}
    >
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-heading">Complaint list</h2>
            <p className="text-sm text-muted">Manage assignments by category.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {complaints.map((item) => (
            <div
              key={item.id}
              className="flex w-full flex-col items-start gap-2 rounded-2xl border border-border bg-surface/75 p-4 text-left shadow-sm transition-all duration-200 hover:bg-surface/90 hover:shadow-md"
            >
              <div className="flex w-full items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-heading font-jakarta">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Room {item.room} · {item.category}
                  </p>
                </div>
                <StatusPill status={item.status} />
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full text-xs text-muted">
                <span className="truncate">
                  Assigned Vendor: <strong className="text-body font-semibold">{item.assignedTo ?? "Unassigned"}</strong>
                </span>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-full border border-border hover:bg-surface text-2xs font-semibold py-1 h-7 px-3.5"
                  >
                    <Link href={`/dashboard/admin/complaints/${item.id}`}>
                      View Details
                    </Link>
                  </Button>
                  {!item.assignedTo && item.status !== "Closed" && item.status !== "Fixed" && (
                    <Button
                      onClick={() => {
                        setSelected(item.id);
                        setOpen(true);
                      }}
                      className="rounded-full border border-primary bg-primary text-white hover:bg-transparent hover:text-primary transition-all duration-200 text-2xs font-semibold py-1 h-7 px-3.5"
                    >
                      Assign Vendor
                    </Button>
                  )}
                  <span className="text-[10px] font-mono">{item.id}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <AssignVendorModal
        open={open}
        onClose={() => setOpen(false)}
        vendors={vendors.map((item) => item.name)}
        onAssign={handleAssign}
      />
    </DashboardShell>
  );
}
