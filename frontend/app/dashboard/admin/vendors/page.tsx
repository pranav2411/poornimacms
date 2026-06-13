"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm-context";
import { addVendor, getVendors, removeVendor } from "@/lib/api";
import type { VendorItem } from "@/lib/types";

type Department = {
  id: string;
  name: string;
  description?: string;
};

export default function AdminVendorsPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const confirm = useConfirm();

  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [addingVendor, setAddingVendor] = useState(false);

  const isSuperadmin = session?.user?.role === "superadmin";
  const userDeptId = session?.user?.departmentId || "";

  // 1. Fetch departments if superadmin
  useEffect(() => {
    if (session === undefined) return;
    if (!isSuperadmin) {
      setSelectedDeptId(userDeptId);
      return;
    }

    const loadDepartments = async () => {
      try {
        const res = await fetch("/api/departments");
        if (!res.ok) throw new Error("Failed to fetch departments");
        const data = (await res.json()) as Department[];
        setDepartments(data);
        if (data.length > 0) {
          setSelectedDeptId(data[0].id);
        }
      } catch (error) {
        addToast({
          title: "Error",
          description: "Could not load departments",
          variant: "destructive",
        });
      }
    };

    loadDepartments();
  }, [session, isSuperadmin, userDeptId, addToast]);

  // 2. Fetch vendors of selected department
  useEffect(() => {
    if (session === undefined) return;
    if (isSuperadmin && !selectedDeptId) return;

    let isMounted = true;
    const loadVendors = async () => {
      try {
        setIsLoading(true);
        const data = await getVendors({ departmentId: selectedDeptId || undefined });
        if (!isMounted) return;
        setVendors(data);
        setIsLoading(false);
      } catch (error) {
        if (!isMounted) return;
        setVendors([]);
        setIsLoading(false);
        addToast({
          title: "Error",
          description: "Failed to load vendors list",
          variant: "destructive",
        });
      }
    };

    loadVendors();
    return () => {
      isMounted = false;
    };
  }, [session, selectedDeptId, isSuperadmin, addToast]);

  // 3. Add vendor handler
  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName) return;

    const emailClean = newEmail.trim().toLowerCase();
    if (!emailClean.endsWith("@poornima.org")) {
      addToast({
        title: "Invalid Email Address",
        description: "Only campus emails ending with @poornima.org are permitted.",
        variant: "destructive",
      });
      return;
    }

    const deptToAssign = selectedDeptId || userDeptId;
    if (!deptToAssign) {
      addToast({
        title: "Error",
        description: "No department selected to assign the vendor.",
        variant: "destructive",
      });
      return;
    }

    setAddingVendor(true);
    try {
      const newVendor = await addVendor({
        email: emailClean,
        name: newName.trim(),
        departmentId: deptToAssign,
      });

      setVendors((prev) => [newVendor, ...prev]);
      addToast({
        title: "Vendor Added",
        description: `${newName} has been assigned to the department successfully.`,
      });

      setNewEmail("");
      setNewName("");
      setShowAddModal(false);
    } catch (error) {
      addToast({
        title: "Error Adding Vendor",
        description: error instanceof Error ? error.message : "Failed to add vendor.",
        variant: "destructive",
      });
    } finally {
      setAddingVendor(false);
    }
  };

  // 4. Remove vendor handler (dissociate from department)
  const handleRemoveVendor = async (vendor: VendorItem) => {
    const confirmed = await confirm({
      title: "Remove Vendor from Department",
      description: `Are you sure you want to remove ${vendor.name} from the department? They will no longer be assignable to new complaints here.`,
      confirmText: "Remove Vendor",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    // Optimistically update UI
    const previousVendors = [...vendors];
    setVendors((prev) => prev.filter((v) => v.id !== vendor.id));

    try {
      await removeVendor(vendor.id);
      addToast({
        title: "Vendor Removed",
        description: `${vendor.name} has been removed from this department.`,
      });
    } catch (error) {
      setVendors(previousVendors);
      addToast({
        title: "Error Removing Vendor",
        description: error instanceof Error ? error.message : "Failed to remove vendor.",
        variant: "destructive",
      });
    }
  };

  const selectedDepartmentName = isSuperadmin
    ? departments.find((d) => d.id === selectedDeptId)?.name || "Selected Department"
    : "Your Department";

  return (
    <DashboardShell
      role="admin"
      title="Vendors"
      subtitle={isSuperadmin ? "Manage vendors across PCE departments" : "Manage your department's vendors"}
      userName={session?.user?.name || "Admin Desk"}
      avatarUrl={session?.user?.image || "/avatar-placeholder.svg"}
    >
      <div className="grid gap-6">
        {/* Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {isSuperadmin && (
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-body outline-none focus:border-primary transition-all duration-200"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <Button
            onClick={() => setShowAddModal(true)}
            disabled={isSuperadmin && !selectedDeptId}
            className="rounded-full bg-primary hover:bg-primary/90 text-white shadow-md transition-all duration-200 self-end sm:self-auto"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Department Vendor
          </Button>
        </div>

        {/* Vendors Grid */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-heading font-jakarta">
            Vendors list for {selectedDepartmentName}
          </h2>
          <p className="text-sm text-muted mb-4">
            These vendors are authorized to resolve campus complaints in this category.
          </p>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={`vendor-skeleton-${idx}`}
                  className="rounded-2xl border border-border bg-surface/50 p-4 animate-pulse h-28"
                />
              ))}
            </div>
          ) : vendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="mt-4 text-sm font-medium text-heading">No vendors assigned</p>
              <p className="text-xs text-muted mt-1">
                Use the "Add Department Vendor" button to add someone.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vendors.map((vendor) => {
                const initials = vendor.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <div
                    key={vendor.id}
                    className="flex items-start justify-between rounded-2xl border border-border bg-surface/70 p-4 transition-all duration-300 hover:border-accent/40 hover:bg-surface/90 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary border border-primary/20">
                        {initials || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-heading">
                          {vendor.name}
                        </p>
                        <p className="truncate text-xs text-muted font-mono">
                          {vendor.email || "No Email"}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="destructive"
                      onClick={() => handleRemoveVendor(vendor)}
                      aria-label={`Remove ${vendor.name}`}
                      title="Remove from Department"
                      className="rounded-full h-8 w-8 p-0"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Pre-verify Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <GlassCard className="relative z-10 w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-border bg-surface/95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-heading font-jakarta">
                Add Department Vendor
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted hover:text-heading transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddVendor} className="mt-4 grid gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Vendor Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Shyam Plumber"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-heading outline-none focus:border-primary transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="shyam@poornima.org"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-heading outline-none focus:border-primary transition-all duration-200"
                />
                <p className="text-[10px] text-muted mt-1">
                  Must end with @poornima.org. If this user already exists, they will be promoted to vendor in this department.
                </p>
              </div>

              <div className="mt-4 flex gap-3 border-t border-border pt-4">
                <Button
                  type="submit"
                  disabled={addingVendor}
                  className="flex-1 rounded-full bg-primary hover:bg-primary/90 text-white shadow-md"
                >
                  {addingVendor ? "Adding..." : "Add Vendor"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-full border-border bg-transparent text-heading hover:bg-surface/50"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </DashboardShell>
  );
}
