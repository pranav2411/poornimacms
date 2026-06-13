"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm-context";
import { addVendor, removeVendor } from "@/lib/api";

type Admin = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

type Department = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
  admins: Admin[];
  vendors: Admin[];
};

export default function DepartmentsManagementClient({
  initialDepartments,
  availableAdmins,
}: {
  initialDepartments: Department[];
  availableAdmins: Admin[];
  availableVendors: Admin[]; // Kept for backwards compatibility in page prop
}) {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [availableAdminsState, setAvailableAdminsState] = useState<Admin[]>(availableAdmins);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Modal states
  const [selectedDeptForAdmins, setSelectedDeptForAdmins] = useState<Department | null>(null);
  const [selectedDeptForVendors, setSelectedDeptForVendors] = useState<Department | null>(null);

  const { addToast } = useToast();
  const confirm = useConfirm();

  // Create Department Handler
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to create department");
      }

      const newDept = (await res.json()) as Department;

      // Add to list with empty admins/vendors
      setDepartments((prev) => [...prev, { ...newDept, admins: [], vendors: [] }]);
      setName("");
      setDescription("");

      addToast({
        title: "Department created",
        description: `"${newDept.name}" department has been added.`,
        variant: "default",
      });
    } catch (err) {
      addToast({
        title: "Error creating department",
        description: err instanceof Error ? err.message : "Operation failed.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // Sync Assigned Admins for a Department
  const handleAdminSync = async (departmentId: string, updatedAdminIds: string[]) => {
    const previousDepts = [...departments];
    const updatedAdminsList = availableAdminsState.filter((a) =>
      updatedAdminIds.includes(a.id)
    );

    setDepartments((prev) =>
      prev.map((d) =>
        d.id === departmentId ? { ...d, admins: updatedAdminsList } : d
      )
    );

    // If modal is active, update the active modal data too
    if (selectedDeptForAdmins && selectedDeptForAdmins.id === departmentId) {
      setSelectedDeptForAdmins((prev) =>
        prev ? { ...prev, admins: updatedAdminsList } : null
      );
    }

    try {
      const res = await fetch(`/api/departments/${departmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminIds: updatedAdminIds }),
      });

      if (!res.ok) {
        throw new Error("Failed to sync department admins");
      }

      addToast({
        title: "Administrators synced",
        variant: "default",
      });
    } catch (err) {
      setDepartments(previousDepts);
      if (selectedDeptForAdmins && selectedDeptForAdmins.id === departmentId) {
        setSelectedDeptForAdmins(previousDepts.find((d) => d.id === departmentId) || null);
      }
      addToast({
        title: "Sync failed",
        description: "Could not update assigned admins. Rolled back.",
        variant: "destructive",
      });
    }
  };

  // Toggle Admin Assignment for a Department
  const toggleAdminAssignment = (departmentId: string, adminId: string) => {
    const dept = departments.find((d) => d.id === departmentId);
    if (!dept) return;

    const currentAssignedIds = dept.admins.map((a) => a.id);
    let newAdminIds: string[];

    if (currentAssignedIds.includes(adminId)) {
      newAdminIds = currentAssignedIds.filter((id) => id !== adminId);
    } else {
      newAdminIds = [...currentAssignedIds, adminId];
    }

    void handleAdminSync(departmentId, newAdminIds);
  };

  // Make Admin and Assign to Department (within department modal)
  const handleMakeAdminAndAssign = async (departmentId: string, user: any) => {
    try {
      if (user.role !== "admin") {
        const roleRes = await fetch(`/api/users/${user.id}/role`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "admin" }),
        });

        if (!roleRes.ok) {
          const data = await roleRes.json();
          throw new Error(data.error || "Failed to update user role to admin");
        }
      }

      const formattedUser: Admin = {
        id: user.id,
        name: user.name || user.email.split("@")[0],
        email: user.email,
        image: user.image || null,
      };

      // Update available admins list locally
      setAvailableAdminsState((prev) => {
        if (prev.some((a) => a.id === user.id)) return prev;
        return [...prev, formattedUser].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      });

      // Assign to department
      const dept = departments.find((d) => d.id === departmentId);
      if (dept) {
        const currentAssignedIds = dept.admins.map((a) => a.id);
        if (!currentAssignedIds.includes(user.id)) {
          const newAdminIds = [...currentAssignedIds, user.id];

          const res = await fetch(`/api/departments/${departmentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ adminIds: newAdminIds }),
          });

          if (!res.ok) {
            throw new Error("Failed to assign admin to department");
          }

          // Update local state
          const updatedAdmins = [...dept.admins, formattedUser];
          setDepartments((prev) =>
            prev.map((d) =>
              d.id === departmentId ? { ...d, admins: updatedAdmins } : d
            )
          );

          if (selectedDeptForAdmins && selectedDeptForAdmins.id === departmentId) {
            setSelectedDeptForAdmins((prev) =>
              prev ? { ...prev, admins: updatedAdmins } : null
            );
          }
        }
      }

      addToast({
        title: "Admin assigned",
        description: `${user.name || user.email} has been assigned to the department.`,
        variant: "default",
      });
    } catch (err) {
      addToast({
        title: "Action failed",
        description: err instanceof Error ? err.message : "Failed to promote and assign user.",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Add Vendor to Department
  const handleAddVendorToDept = async (departmentId: string, email: string, name: string) => {
    try {
      const newVendor = await addVendor({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        departmentId,
      });

      const formattedVendor: Admin = {
        id: newVendor.id,
        name: newVendor.name,
        email: newVendor.email!,
        image: null,
      };

      // Update local state (remove vendor from other departments if re-assigned)
      setDepartments((prev) =>
        prev.map((d) => {
          // Remove from previous department
          const cleanedVendors = d.vendors.filter((v) => v.id !== formattedVendor.id);
          if (d.id === departmentId) {
            return {
              ...d,
              vendors: [...cleanedVendors, formattedVendor],
            };
          }
          return {
            ...d,
            vendors: cleanedVendors,
          };
        })
      );

      // Update active modal view state
      if (selectedDeptForVendors) {
        setSelectedDeptForVendors((prev) => {
          if (!prev) return null;
          if (prev.id === departmentId) {
            const cleaned = prev.vendors.filter((v) => v.id !== formattedVendor.id);
            return {
              ...prev,
              vendors: [...cleaned, formattedVendor],
            };
          } else {
            return {
              ...prev,
              vendors: prev.vendors.filter((v) => v.id !== formattedVendor.id),
            };
          }
        });
      }

      addToast({
        title: "Vendor Assigned",
        description: `${name} has been assigned as a vendor.`,
        variant: "default",
      });
    } catch (err) {
      addToast({
        title: "Error adding vendor",
        description: err instanceof Error ? err.message : "Operation failed.",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Remove Vendor from Department (clears their department field)
  const handleRemoveVendorFromDept = async (departmentId: string, vendorId: string, name: string) => {
    const confirmed = await confirm({
      title: "Remove Vendor",
      description: `Are you sure you want to remove ${name} from this department?`,
      confirmText: "Remove",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      await removeVendor(vendorId);

      setDepartments((prev) =>
        prev.map((d) => {
          if (d.id === departmentId) {
            return {
              ...d,
              vendors: d.vendors.filter((v) => v.id !== vendorId),
            };
          }
          return d;
        })
      );

      if (selectedDeptForVendors && selectedDeptForVendors.id === departmentId) {
        setSelectedDeptForVendors((prev) =>
          prev
            ? {
              ...prev,
              vendors: prev.vendors.filter((v) => v.id !== vendorId),
            }
            : null
        );
      }

      addToast({
        title: "Vendor removed",
        description: `${name} has been removed from this department.`,
        variant: "default",
      });
    } catch (err) {
      addToast({
        title: "Error removing vendor",
        description: err instanceof Error ? err.message : "Operation failed.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Creation Form */}
      <div className="lg:col-span-1">
        <GlassCard className="p-6 sticky top-24">
          <h2 className="text-lg font-semibold text-heading font-jakarta">
            Create Department
          </h2>
          <p className="text-xs text-muted mt-1">
            Add a new college department. You can assign admins to it later.
          </p>

          <form onSubmit={handleCreate} className="mt-6 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                Department Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Electrical, Plumbing"
                className="w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-heading outline-none focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief details about the department services..."
                rows={4}
                className="w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-heading outline-none focus:border-primary transition-all resize-none"
              />
            </div>
            <Button
              type="submit"
              disabled={creating || !name.trim()}
              className="mt-2 w-full rounded-full bg-primary hover:bg-primary/90 text-white"
            >
              {creating ? "Creating..." : "Create Department"}
            </Button>
          </form>
        </GlassCard>
      </div>

      {/* Departments List */}
      <div className="lg:col-span-2">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-heading font-jakarta">
            Existing Departments
          </h2>
          <p className="text-xs text-muted mt-1">
            View departments and configure assigned administrator and vendor roles.
          </p>

          {departments.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12">
              <p className="text-sm font-medium text-heading">No departments found</p>
              <p className="text-xs text-muted">Use the panel on the left to add one.</p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              {departments.map((dept) => {
                return (
                  <div
                    key={dept.id}
                    className="flex flex-col gap-4 rounded-2xl border border-border bg-surface/40 p-5 hover:bg-surface/60 transition-all duration-200"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-heading">{dept.name}</h3>
                        {dept.description && (
                          <p className="text-xs text-body mt-1 leading-relaxed max-w-lg">
                            {dept.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDeptForAdmins(dept)}
                          className="rounded-full border-border bg-surface px-4 py-2 text-xs flex items-center gap-2"
                        >
                          <span>Manage Admins</span>
                          <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-bold">
                            {dept.admins.length}
                          </span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDeptForVendors(dept)}
                          className="rounded-full border-border bg-surface px-4 py-2 text-xs flex items-center gap-2"
                        >
                          <span>Manage Vendors</span>
                          <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-bold">
                            {dept.vendors.length}
                          </span>
                        </Button>
                      </div>
                    </div>

                    {/* Display Assigned Admins & Vendors List visually */}
                    {(dept.admins.length > 0 || dept.vendors.length > 0) && (
                      <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
                        {dept.admins.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted mr-1">
                              Admins:
                            </span>
                            {dept.admins.map((admin) => (
                              <div
                                key={admin.id}
                                className="flex items-center gap-1.5 rounded-full border border-border bg-surface/50 py-1 pl-1 pr-2.5 text-xs text-heading"
                              >
                                <div className="relative h-4 w-4 overflow-hidden rounded-full bg-muted">
                                  <Image
                                    src={admin.image || "/user-no-av.png"}
                                    alt={admin.name || "Admin"}
                                    fill
                                    sizes="16px"
                                    className="object-cover"
                                  />
                                </div>
                                <span className="font-medium truncate max-w-[100px]">
                                  {admin.name || "Admin"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {dept.vendors.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted mr-1">
                              Vendors:
                            </span>
                            {dept.vendors.map((vendor) => (
                              <div
                                key={vendor.id}
                                className="flex items-center gap-1.5 rounded-full border border-border bg-surface/50 py-1 pl-1 pr-2.5 text-xs text-heading"
                              >
                                <div className="relative h-4 w-4 overflow-hidden rounded-full bg-muted">
                                  <Image
                                    src={vendor.image || "/user-no-av.png"}
                                    alt={vendor.name || "Vendor"}
                                    fill
                                    sizes="16px"
                                    className="object-cover"
                                  />
                                </div>
                                <span className="font-medium truncate max-w-[100px]">
                                  {vendor.name || "Vendor"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {/* Modal: Manage Admins for Department */}
        {selectedDeptForAdmins && (
          <ManageDeptAdminsModal
            department={selectedDeptForAdmins}
            availableAdmins={availableAdminsState}
            onClose={() => setSelectedDeptForAdmins(null)}
            onToggleAdmin={toggleAdminAssignment}
            onMakeAdminAndAssign={handleMakeAdminAndAssign}
          />
        )}

        {/* Modal: Manage Vendors for Department */}
        {selectedDeptForVendors && (
          <ManageDeptVendorsModal
            department={selectedDeptForVendors}
            departments={departments}
            onClose={() => setSelectedDeptForVendors(null)}
            onAddVendor={handleAddVendorToDept}
            onRemoveVendor={handleRemoveVendorFromDept}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ----------------------------------------------------
// SUB-COMPONENTS (Modals)
// ----------------------------------------------------

// 1. Department Admins Modal
function ManageDeptAdminsModal({
  department,
  availableAdmins,
  onClose,
  onToggleAdmin,
  onMakeAdminAndAssign,
}: {
  department: Department;
  availableAdmins: Admin[];
  onClose: () => void;
  onToggleAdmin: (deptId: string, adminId: string) => void;
  onMakeAdminAndAssign: (deptId: string, user: any) => Promise<void>;
}) {
  const [searchEmail, setSearchEmail] = useState("");
  const [searchedUser, setSearchedUser] = useState<any | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [promoting, setPromoting] = useState(false);

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;

    setSearching(true);
    setSearchError("");
    setSearchedUser(null);

    try {
      const res = await fetch(`/api/users/by-email?email=${encodeURIComponent(searchEmail.trim())}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("User not found in system.");
        }
        const data = await res.json();
        throw new Error(data.error || "Failed to search user");
      }

      const user = await res.json();
      setSearchedUser({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image || null,
        role: user.role,
      });
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const handleAssignClick = async () => {
    if (!searchedUser) return;
    setPromoting(true);
    try {
      await onMakeAdminAndAssign(department.id, searchedUser);
      setSearchedUser(null);
      setSearchEmail("");
    } catch (err) {
      // handled by parent toast
    } finally {
      setPromoting(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60 px-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-start justify-between border-b border-border pb-3">
            <div>
              <p className="text-lg font-semibold text-heading font-jakarta">
                Manage Admins: {department.name}
              </p>
              <p className="text-xs text-muted mt-1">
                Assign or remove administrators for this department.
              </p>
            </div>
            <Button
              type="button"
              onClick={onClose}
              size="icon-sm"
              className="border-red-500 bg-red-500 text-white hover:bg-transparent hover:text-red-500"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </div>

          {/* User Search & Promotion */}
          <div className="mt-4 border-b border-border pb-4">
            <form onSubmit={handleSearchUser}>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                Search user by email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="e.g. admin@poornima.org"
                  required
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-heading outline-none focus:border-primary transition-all duration-200"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={searching || !searchEmail}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-white px-4 text-xs"
                >
                  {searching ? "Searching..." : "Search"}
                </Button>
              </div>

              {searchError && (
                <p className="text-xs text-rose-500 mt-2">{searchError}</p>
              )}

              {searchedUser && (
                <div className="mt-3 rounded-xl border border-border bg-surface/50 p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative h-9 w-9 overflow-hidden rounded-full border border-border bg-muted">
                      <Image
                        src={searchedUser.image || "/user-no-av.png"}
                        alt={searchedUser.name || "User"}
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-heading truncate text-xs">
                        {searchedUser.name || "User"}
                      </p>
                      <p className="text-[10px] font-medium text-muted uppercase">
                        Current Role: {searchedUser.role || "None"}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={promoting}
                    onClick={handleAssignClick}
                    className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-3 h-8"
                  >
                    {promoting
                      ? "Processing..."
                      : searchedUser.role === "admin"
                        ? "Assign to Department"
                        : "Make Admin & Assign"}
                  </Button>
                </div>
              )}
            </form>
          </div>

          {/* Assigned & Available Admins checklist */}
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              Available Administrators
            </p>
            {availableAdmins.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center">
                No admin users available. Use the search above to add one.
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                {availableAdmins.map((admin) => {
                  const isAssigned = department.admins.some((a) => a.id === admin.id);

                  return (
                    <label
                      key={admin.id}
                      className="flex items-center gap-3 rounded-xl border border-border/40 hover:border-border px-3 py-2 hover:bg-muted cursor-pointer text-xs transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => onToggleAdmin(department.id, admin.id)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <div className="relative h-6 w-6 overflow-hidden rounded-full border border-border bg-muted">
                        <Image
                          src={admin.image || "/user-no-av.png"}
                          alt={admin.name || "Admin"}
                          fill
                          sizes="24px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 truncate">
                        <p className="font-semibold text-heading truncate">
                          {admin.name || "Admin"}
                        </p>
                        <p className="text-[10px] text-muted truncate">{admin.email}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

// 2. Department Vendors Modal
function ManageDeptVendorsModal({
  department,
  departments,
  onClose,
  onAddVendor,
  onRemoveVendor,
}: {
  department: Department;
  departments: Department[];
  onClose: () => void;
  onAddVendor: (deptId: string, email: string, name: string) => Promise<void>;
  onRemoveVendor: (deptId: string, vendorId: string, name: string) => Promise<void>;
}) {
  const [searchEmail, setSearchEmail] = useState("");
  const [searchedUser, setSearchedUser] = useState<any | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [promoting, setPromoting] = useState(false);

  // Quick creation fields (fallback when email search returns 404)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;

    setSearching(true);
    setSearchError("");
    setSearchedUser(null);
    setShowCreateForm(false);

    try {
      const res = await fetch(`/api/users/by-email?email=${encodeURIComponent(searchEmail.trim())}`);
      if (!res.ok) {
        if (res.status === 404) {
          setShowCreateForm(true);
          setCreateName("");
          throw new Error("Email not found in system. Fill in details below to create a new vendor account.");
        }
        const data = await res.json();
        throw new Error(data.error || "Failed to search user");
      }

      const user = await res.json();
      setSearchedUser({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image || null,
        role: user.role,
      });
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const handleAssignClick = async () => {
    if (!searchedUser) return;
    setPromoting(true);
    try {
      await onAddVendor(department.id, searchedUser.email, searchedUser.name || searchedUser.email.split("@")[0]);
      setSearchedUser(null);
      setSearchEmail("");
    } catch (err) {
      // handled by parent toast
    } finally {
      setPromoting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim() || !createName.trim()) return;

    setPromoting(true);
    try {
      await onAddVendor(department.id, searchEmail.trim(), createName.trim());
      setSearchedUser(null);
      setSearchEmail("");
      setShowCreateForm(false);
    } catch (err) {
      // handled by parent toast
    } finally {
      setPromoting(false);
    }
  };

  // Find if a vendor is currently assigned to any other department
  const getExistingDeptInfo = (userId: string) => {
    return departments.find((d) => d.vendors.some((v) => v.id === userId));
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60 px-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-start justify-between border-b border-border pb-3">
            <div>
              <p className="text-lg font-semibold text-heading font-jakarta">
                Manage Vendors: {department.name}
              </p>
              <p className="text-xs text-muted mt-1">
                Add, assign, or remove service vendors for this department.
              </p>
            </div>
            <Button
              type="button"
              onClick={onClose}
              size="icon-sm"
              className="border-red-500 bg-red-500 text-white hover:bg-transparent hover:text-red-500"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </div>

          {/* User Search & Add form */}
          <div className="mt-4 border-b border-border pb-4">
            <form onSubmit={handleSearchUser}>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                Add Vendor by Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="e.g. plumbing-vendor@poornima.org"
                  required
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-heading outline-none focus:border-primary transition-all duration-200"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={searching || !searchEmail}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-white px-4 text-xs"
                >
                  {searching ? "Searching..." : "Search"}
                </Button>
              </div>

              {searchError && (
                <p className="text-xs text-rose-500 mt-2">{searchError}</p>
              )}

              {searchedUser && (
                <div className="mt-3 rounded-xl border border-border bg-surface/50 p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative h-9 w-9 overflow-hidden rounded-full border border-border bg-muted">
                      <Image
                        src={searchedUser.image || "/user-no-av.png"}
                        alt={searchedUser.name || "User"}
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-heading truncate text-xs">
                        {searchedUser.name || "User"}
                      </p>
                      <p className="text-[10px] font-medium text-muted uppercase">
                        Role: {searchedUser.role || "None"}
                      </p>
                    </div>
                  </div>

                  {/* Render promote/assign button with proper checks */}
                  {(() => {
                    const existingDept = getExistingDeptInfo(searchedUser.id);
                    if (existingDept) {
                      if (existingDept.id === department.id) {
                        return <span className="text-xs text-muted font-medium">Already assigned</span>;
                      } else {
                        return (
                          <Button
                            type="button"
                            size="sm"
                            disabled={promoting}
                            onClick={handleAssignClick}
                            className="rounded-full bg-amber-600 hover:bg-amber-700 text-white text-[11px] px-3 h-8"
                          >
                            {promoting ? "Moving..." : `Move from ${existingDept.name}`}
                          </Button>
                        );
                      }
                    }
                    return (
                      <Button
                        type="button"
                        size="sm"
                        disabled={promoting}
                        onClick={handleAssignClick}
                        className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-3 h-8"
                      >
                        {promoting ? "Assigning..." : "Assign Vendor"}
                      </Button>
                    );
                  })()}
                </div>
              )}
            </form>

            {/* Quick Create Form fallback */}
            {showCreateForm && (
              <form onSubmit={handleCreateSubmit} className="mt-3 rounded-xl border border-border bg-surface/50 p-3 grid gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
                    Vendor Name (for new account)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Electricals"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-heading outline-none focus:border-primary transition-all duration-200"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateForm(false)}
                    className="rounded-full text-xs h-8 px-3"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={promoting || !createName.trim()}
                    className="rounded-full bg-primary hover:bg-primary/90 text-white text-xs h-8 px-4 font-semibold"
                  >
                    {promoting ? "Creating..." : "Create & Assign Vendor"}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Assigned vendors list */}
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              Assigned Vendors ({department.vendors.length})
            </p>
            {department.vendors.length === 0 ? (
              <p className="text-xs text-muted py-8 text-center border border-dashed border-border rounded-xl">
                No vendors assigned to this department yet.
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                {department.vendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/40 px-3 py-2 hover:bg-muted text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="relative h-6 w-6 overflow-hidden rounded-full border border-border bg-muted shrink-0">
                        <Image
                          src={vendor.image || "/user-no-av.png"}
                          alt={vendor.name || "Vendor"}
                          fill
                          sizes="24px"
                          className="object-cover"
                        />
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-heading truncate">
                          {vendor.name || "Vendor"}
                        </p>
                        <p className="text-[10px] text-muted truncate">{vendor.email}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onRemoveVendor(department.id, vendor.id, vendor.name || vendor.email)}
                      className="rounded-full border-red-500 bg-red-500 text-white hover:bg-transparent hover:text-red-500 text-[10px] px-3.5 h-7 py-0 font-medium"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
