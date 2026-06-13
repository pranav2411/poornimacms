"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast";

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
};

export default function DepartmentsManagementClient({
  initialDepartments,
  availableAdmins,
}: {
  initialDepartments: Department[];
  availableAdmins: Admin[];
}) {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [availableAdminsState, setAvailableAdminsState] = useState<Admin[]>(availableAdmins);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Search states for user lookup
  const [searchEmail, setSearchEmail] = useState("");
  const [searchedUser, setSearchedUser] = useState<any | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [promoting, setPromoting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const { addToast } = useToast();

  // Reset search state when active dropdown changes
  useEffect(() => {
    setSearchEmail("");
    setSearchedUser(null);
    setSearchError("");
    setSearching(false);
  }, [activeDropdownId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleMakeAdminAndAssign = async (departmentId: string, user: any) => {
    setPromoting(true);
    try {
      // 1. Promote to Admin in database if they aren't already
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

      // 2. Add to available admins state if not already present
      const formattedUser: Admin = {
        id: user.id,
        name: user.name || user.email.split("@")[0],
        email: user.email,
        image: user.image || null,
      };

      setAvailableAdminsState((prev) => {
        if (prev.some((a) => a.id === user.id)) return prev;
        return [...prev, formattedUser].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      });

      // 3. Assign to this department
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

          // Update local departments state
          setDepartments((prev) =>
            prev.map((d) =>
              d.id === departmentId ? { ...d, admins: [...d.admins, formattedUser] } : d
            )
          );
        }
      }

      addToast({
        title: "Admin assigned",
        description: `${user.name || user.email} has been assigned to the department.`,
        variant: "default",
      });

      // Reset search
      setSearchedUser(null);
      setSearchEmail("");
    } catch (err) {
      addToast({
        title: "Action failed",
        description: err instanceof Error ? err.message : "Failed to promote and assign user.",
        variant: "destructive",
      });
    } finally {
      setPromoting(false);
    }
  };

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

      // Add to list with empty admins
      setDepartments((prev) => [...prev, { ...newDept, admins: [] }]);
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

  const handleAdminSync = async (departmentId: string, updatedAdminIds: string[]) => {
    // Optimistically update local state
    const previousDepts = [...departments];
    const updatedAdminsList = availableAdminsState.filter((a) =>
      updatedAdminIds.includes(a.id)
    );

    setDepartments((prev) =>
      prev.map((d) =>
        d.id === departmentId ? { ...d, admins: updatedAdminsList } : d
      )
    );

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
      addToast({
        title: "Sync failed",
        description: "Could not update assigned admins. Rolled back.",
        variant: "destructive",
      });
    }
  };

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
            View departments and configure assigned administrator roles.
          </p>

          {departments.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12">
              <p className="text-sm font-medium text-heading">No departments found</p>
              <p className="text-xs text-muted">Use the panel on the left to add one.</p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              {departments.map((dept) => {
                const isDropdownOpen = activeDropdownId === dept.id;

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

                      {/* Admin Multi-Select Dropdown Container */}
                      <div className="relative" ref={isDropdownOpen ? dropdownRef : null}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setActiveDropdownId(isDropdownOpen ? null : dept.id)
                          }
                          className="rounded-full border-border bg-surface px-4 py-2 text-xs flex items-center gap-2"
                        >
                          <span>Manage Admins</span>
                          <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-bold">
                            {dept.admins.length}
                          </span>
                          <svg
                            viewBox="0 0 20 20"
                            className="h-3 w-3 text-muted"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M6 8l4 4 4-4" />
                          </svg>
                        </Button>

                        {isDropdownOpen && (
                          <div className="absolute right-0 mt-2 z-30 w-72 rounded-2xl border border-border bg-surface p-4 shadow-xl max-h-[360px] overflow-y-auto">
                            {/* Search Form */}
                            <form onSubmit={handleSearchUser} className="mb-3 border-b border-border pb-3">
                              <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5 px-0.5">
                                Search user by email
                              </label>
                              <div className="flex gap-1.5">
                                <input
                                  type="email"
                                  placeholder="e.g. name@poornima.org"
                                  required
                                  value={searchEmail}
                                  onChange={(e) => setSearchEmail(e.target.value)}
                                  className="flex-1 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs text-heading outline-none focus:border-primary transition-all duration-200"
                                />
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={searching || !searchEmail}
                                  className="rounded-xl bg-primary hover:bg-primary/90 text-white px-3 py-1.5 text-xs"
                                >
                                  {searching ? "..." : "Go"}
                                </Button>
                              </div>

                              {searchError && (
                                <p className="text-[10px] text-rose-500 mt-1.5 px-0.5">{searchError}</p>
                              )}

                              {searchedUser && (
                                <div className="mt-2.5 rounded-xl border border-border bg-surface/50 p-2.5 flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="relative h-7 w-7 overflow-hidden rounded-full border border-border bg-muted">
                                      <Image
                                        src={searchedUser.image || "/user-no-av.png"}
                                        alt={searchedUser.name || "User"}
                                        fill
                                        sizes="28px"
                                        className="object-cover"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-heading truncate text-xs">
                                        {searchedUser.name || "User"}
                                      </p>
                                      <p className="text-[9px] font-medium text-muted uppercase">
                                        Role: {searchedUser.role || "None"}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={promoting}
                                    onClick={() => handleMakeAdminAndAssign(dept.id, searchedUser)}
                                    className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] py-1 h-7.5"
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

                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2 px-0.5">
                              Assigned Admins
                            </p>
                            {availableAdminsState.length === 0 ? (
                              <p className="text-xs text-muted p-2 text-center">
                                No admin users available. Use the search above to add one.
                              </p>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                {availableAdminsState.map((admin) => {
                                  const isAssigned = dept.admins.some(
                                    (a) => a.id === admin.id
                                  );

                                  return (
                                    <label
                                      key={admin.id}
                                      className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-muted cursor-pointer text-xs transition-colors"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isAssigned}
                                        onChange={() =>
                                          toggleAdminAssignment(dept.id, admin.id)
                                        }
                                        className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                                      />
                                      <div className="relative h-5 w-5 overflow-hidden rounded-full border border-border bg-muted">
                                        <Image
                                          src={admin.image || "/user-no-av.png"}
                                          alt={admin.name || "Admin"}
                                          fill
                                          sizes="20px"
                                          className="object-cover"
                                        />
                                      </div>
                                      <div className="flex-1 truncate">
                                        <p className="font-semibold text-heading truncate">
                                          {admin.name || "Admin"}
                                        </p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Display Assigned Admins List visually */}
                    {dept.admins.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted mr-1">
                          Assigned:
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
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
