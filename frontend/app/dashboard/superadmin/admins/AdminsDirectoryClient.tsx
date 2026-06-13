"use client";

import { useState } from "react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm-context";

type Admin = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  departments: string[];
};

export default function AdminsDirectoryClient({
  initialAdmins,
}: {
  initialAdmins: Admin[];
}) {
  const [admins, setAdmins] = useState<Admin[]>(initialAdmins);
  const { addToast } = useToast();
  const confirm = useConfirm();

  const handleRevokeAdmin = async (adminId: string, name: string) => {
    const confirmed = await confirm({
      title: "Revoke Admin Access",
      description: `Are you sure you want to revoke admin permissions from ${name}? Their role will be reset to Faculty.`,
      confirmText: "Revoke Access",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    // Optimistic UI update
    const previousAdmins = [...admins];
    setAdmins((prev) => prev.filter((a) => a.id !== adminId));

    try {
      const res = await fetch(`/api/users/${adminId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "faculty" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to revoke admin role");
      }

      addToast({
        title: "Admin privileges revoked",
        description: `${name} has been set back to Faculty.`,
        variant: "default",
      });
    } catch (err) {
      setAdmins(previousAdmins);
      addToast({
        title: "Failed to revoke role",
        description: err instanceof Error ? err.message : "Operation failed.",
        variant: "destructive",
      });
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-heading font-jakarta">Admins</h2>
          <p className="text-sm text-muted">Manage category ownership.</p>
        </div>
      </div>

      {admins.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12">
          <p className="text-sm font-medium text-heading">No administrators found</p>
          <p className="text-xs text-muted">Assign users to departments to make them admins.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-surface/70 p-4 hover:bg-surface transition-all duration-200"
            >
              <div>
                <p className="text-sm font-semibold text-heading">{admin.name}</p>
                <p className="text-xs text-muted">{admin.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Departments:
                  </span>
                  {admin.departments.length === 0 ? (
                    <span className="text-xs font-medium text-amber-500 bg-amber-500/10 rounded-full px-2.5 py-0.5 border border-amber-500/20">
                      Unassigned
                    </span>
                  ) : (
                    admin.departments.map((dept, index) => (
                      <span
                        key={`${admin.id}-dept-${index}`}
                        className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5 border border-primary/20"
                      >
                        {dept}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => handleRevokeAdmin(admin.id, admin.name)}
                className="rounded-full border-amber-500 bg-amber-500 text-white hover:bg-transparent hover:text-amber-500 self-start sm:self-center"
              >
                Remove Admin
              </Button>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
