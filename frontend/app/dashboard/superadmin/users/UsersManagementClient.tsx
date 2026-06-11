"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm-context";

type User = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string | null;
  status: string;
  created_at: string;
};

export default function UsersManagementClient({
  initialUsers,
  currentUserId,
}: {
  initialUsers: User[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("faculty");
  const [addingUser, setAddingUser] = useState(false);

  // Actions
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    if (!newEmail.toLowerCase().endsWith("@poornima.org")) {
      addToast({
        title: "Invalid Email Address",
        description: "Only campus emails ending with @poornima.org are permitted.",
        variant: "destructive",
      });
      return;
    }

    setAddingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: newEmail,
          role: newRole,
          name: newName || undefined,
        }),
      });

      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error || "Failed to add user");
      }

      const newUser = await res.json();
      
      const mappedNewUser: User = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        image: newUser.avatar_url || newUser.image || null,
        role: newUser.role,
        status: newUser.status,
        created_at: newUser.created_at || new Date().toISOString(),
      };

      setUsers((prev) => [mappedNewUser, ...prev]);
      
      addToast({
        title: "User pre-verified successfully",
        description: `${newEmail} has been added as ${newRole}.`,
        variant: "default",
      });

      setNewEmail("");
      setNewName("");
      setNewRole("faculty");
      setShowAddModal(false);
    } catch (err) {
      addToast({
        title: "Error adding user",
        description: err instanceof Error ? err.message : "Failed to pre-verify user.",
        variant: "destructive",
      });
    } finally {
      setAddingUser(false);
    }
  };

  const handleVerify = async (userId: string) => {
    const previousUsers = [...users];

    // Optimistically verify user to 'faculty'
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, status: "verified", role: "faculty" } : u
      )
    );

    addToast({
      title: "Processing verification...",
      variant: "default",
    });

    try {
      const res = await fetch(`/api/users/${userId}/verify`, {
        method: "PATCH",
      });

      if (!res.ok) {
        throw new Error("Failed to verify user");
      }

      addToast({
        title: "User verified successfully",
        description: "Assigned default role of Faculty.",
        variant: "default",
      });
    } catch (err) {
      setUsers(previousUsers);
      addToast({
        title: "Error verifying user",
        description: "Operation failed. Rolled back state.",
        variant: "destructive",
      });
    }
  };

  const handleDeny = async (userId: string) => {
    const previousUsers = [...users];

    // Optimistically deny user
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: "denied" } : u))
    );

    addToast({
      title: "Processing denial...",
      variant: "default",
    });

    try {
      const res = await fetch(`/api/users/${userId}/deny`, {
        method: "PATCH",
      });

      if (!res.ok) {
        throw new Error("Failed to deny user");
      }

      addToast({
        title: "User denied access",
        variant: "default",
      });
    } catch (err) {
      setUsers(previousUsers);
      addToast({
        title: "Error denying user",
        description: "Operation failed. Rolled back state.",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === currentUserId) {
      addToast({
        title: "Cannot change own role",
        description: "To prevent lockouts, you cannot edit your own role.",
        variant: "destructive",
      });
      return;
    }

    const previousUsers = [...users];
    setUpdatingUserId(userId);

    // Optimistically update local users state
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const isUnverified = newRole === "unverified";
          return {
            ...u,
            role: isUnverified ? null : newRole,
            status: isUnverified ? "pending" : "verified",
          };
        }
        return u;
      })
    );

    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        throw new Error("Failed to update role");
      }

      addToast({
        title: "Role updated successfully",
        variant: "default",
      });
    } catch (err) {
      setUsers(previousUsers);
      addToast({
        title: "Error updating role",
        description: "Could not update user role. Rolled back.",
        variant: "destructive",
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUserId) {
      addToast({
        title: "Cannot delete yourself",
        description: "For security, you cannot delete your own account.",
        variant: "destructive",
      });
      return;
    }

    const confirmed = await confirm({
      title: "Delete User",
      description: "Are you sure you want to delete this user? This action cannot be undone.",
      confirmText: "Delete User",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    const previousUsers = [...users];
    setUsers((prev) => prev.filter((u) => u.id !== userId));

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete user");
      }

      addToast({
        title: "User deleted successfully",
        description: "The user account has been permanently deleted.",
        variant: "default",
      });
    } catch (err) {
      setUsers(previousUsers);
      addToast({
        title: "Error deleting user",
        description: err instanceof Error ? err.message : "Could not delete user.",
        variant: "destructive",
      });
    }
  };


  // Filter calculations
  const pendingUsers = users.filter((u) => u.status === "pending");

  const filteredUsers = users.filter((u) => {
    // 1. Search Query
    const nameMatch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const emailMatch = u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = searchQuery === "" || nameMatch || emailMatch;

    // 2. Role Filter
    let matchesRole = true;
    if (roleFilter !== "all") {
      if (roleFilter === "null") {
        matchesRole = u.role === null;
      } else {
        matchesRole = u.role === roleFilter;
      }
    }

    // 3. Status Filter
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="grid gap-8">
      {/* Navigation Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => {
            setActiveTab("pending");
            setSearchQuery("");
          }}
          className={`relative pb-3 text-sm font-semibold transition-all duration-200 ${
            activeTab === "pending"
              ? "text-primary border-b-2 border-primary"
              : "text-muted hover:text-heading"
          } mr-8`}
        >
          Pending Approvals
          {pendingUsers.length > 0 && (
            <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
              {pendingUsers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab("all");
            setSearchQuery("");
          }}
          className={`relative pb-3 text-sm font-semibold transition-all duration-200 ${
            activeTab === "all"
              ? "text-primary border-b-2 border-primary"
              : "text-muted hover:text-heading"
          }`}
        >
          All Users
        </button>
      </div>

      {activeTab === "pending" ? (
        /* PENDING REQUESTS PANEL */
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-heading font-jakarta">
            Pending User Verification Requests
          </h2>
          <p className="text-sm text-muted">
            The following users logged in via Google and are waiting for authorization.
          </p>

          {pendingUsers.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12">
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-4 text-sm font-medium text-heading">
                All caught up!
              </p>
              <p className="text-xs text-muted">
                No users are currently pending verification.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted">
                    <th className="pb-3 pr-4">User</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Requested At</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm text-body">
                  {pendingUsers.map((user) => (
                    <tr key={user.id} className="group hover:bg-surface/30">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-border bg-muted">
                            <Image
                              src={user.image || "/user-no-av.png"}
                              alt={user.name || "User"}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                          <span className="font-semibold text-heading">
                            {user.name || "Anonymous User"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 pr-4 font-mono text-xs">
                        {user.email}
                      </td>
                      <td className="py-4 pr-4 text-xs text-muted">
                        {new Date(user.created_at).toLocaleDateString(undefined, {
                          dateStyle: "medium",
                        })}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleVerify(user.id)}
                            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1 px-3"
                          >
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeny(user.id)}
                            className="rounded-full text-xs py-1 px-3"
                          >
                            Deny
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      ) : (
        /* ALL USERS PANEL */
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
                placeholder="Search by name or email..."
                className="w-full rounded-2xl border border-border bg-surface pl-10 pr-4 py-2.5 text-sm text-heading outline-none focus:border-primary transition-all duration-200"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-body outline-none focus:border-primary"
              >
                <option value="all">All Roles</option>
                <option value="superadmin">Superadmin</option>
                <option value="admin">Admin</option>
                <option value="faculty">Faculty</option>
                <option value="vendor">Vendor</option>
                <option value="null">Unassigned</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-body outline-none focus:border-primary"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="denied">Denied</option>
              </select>

              {/* Add User Button */}
              <Button
                onClick={() => setShowAddModal(true)}
                className="rounded-full bg-primary hover:bg-primary/90 text-white shadow-md transition-all duration-200"
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
                Add User
              </Button>
            </div>
          </div>

          <GlassCard className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted">
                    <th className="pb-3 pr-4">User</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Role</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm text-body">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted">
                        No users match the search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="group hover:bg-surface/30">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-border bg-muted">
                              <Image
                                src={user.image || "/user-no-av.png"}
                                alt={user.name || "User"}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            </div>
                            <span className="font-semibold text-heading">
                              {user.name || "Anonymous User"}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 pr-4 font-mono text-xs">
                          {user.email}
                        </td>
                        <td className="py-4 pr-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              user.status === "verified"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : user.status === "pending"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          <select
                            value={user.role || "unverified"}
                            disabled={
                              user.id === currentUserId ||
                              updatingUserId === user.id
                            }
                            onChange={(e) =>
                              handleRoleChange(user.id, e.target.value)
                            }
                            className={`rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-body outline-none focus:border-primary disabled:opacity-60 transition-all ${
                              user.id === currentUserId
                                ? "cursor-not-allowed font-medium text-primary bg-primary/5 border-primary/20"
                                : ""
                            }`}
                          >
                            <option value="unverified">Unverified (Reset)</option>
                            <option value="faculty">Faculty</option>
                            <option value="vendor">Vendor</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Superadmin</option>
                          </select>
                        </td>
                        <td className="py-4 text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={user.id === currentUserId}
                            onClick={() => handleDeleteUser(user.id)}
                            className="rounded-full text-xs py-1 px-3"
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Pre-verify User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <GlassCard className="relative z-10 w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-border bg-surface/95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-heading font-jakarta">
                Pre-verify Future User
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
            
            <form onSubmit={handleAddUser} className="mt-4 grid gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Email Address (Required)
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name.surname@poornima.org"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-heading outline-none focus:border-primary transition-all duration-200"
                />
                <p className="text-2xs text-muted mt-1">
                  Must be a campus email ending with @poornima.org.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-heading outline-none focus:border-primary transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Assigned Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-body outline-none focus:border-primary"
                >
                  <option value="faculty">Faculty</option>
                  <option value="admin">Admin</option>
                  <option value="vendor">Vendor</option>
                  <option value="superadmin">Superadmin</option>
                </select>
                <p className="text-2xs text-muted mt-1">
                  When logging in, this user will bypass verification and jump straight to their role's dashboard.
                </p>
              </div>

              <div className="mt-4 flex gap-3 border-t border-border pt-4">
                <Button
                  type="submit"
                  disabled={addingUser}
                  className="flex-1 rounded-full bg-primary hover:bg-primary/90 text-white shadow-md"
                >
                  {addingUser ? "Adding..." : "Add & Verify"}
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
    </div>
  );
}
