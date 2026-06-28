import type {
  Complaint,
  NotificationItem,
  StatItem,
  VendorItem,
  ReportItem,
} from "@/lib/types";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  token?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

const buildUrl = (path: string, query?: RequestOptions["query"]) => {
  const baseUrlClean = API_BASE_URL.replace(/\/$/, "");
  const pathClean = path.replace(/^\//, "");
  const url = new URL(`${baseUrlClean}/${pathClean}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined) return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let token = options.token;

  if (!token && typeof window !== "undefined") {
    try {
      const { getFirebaseAuth } = await import("@/lib/firebase");
      const firebaseAuth = getFirebaseAuth();
      // Wait for Firebase to finish loading local auth credentials
      if (typeof firebaseAuth.authStateReady === "function") {
        await firebaseAuth.authStateReady();
      }
      if (firebaseAuth.currentUser) {
        token = await firebaseAuth.currentUser.getIdToken();
      }
    } catch (e) {
      console.error("Failed to get Firebase ID token:", e);
    }
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else if (typeof window === "undefined") {
    const systemKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (systemKey) {
      headers["x-system-key"] = systemKey;
    }
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = "Request failed";
    try {
      const payload = (await response.json()) as { detail?: string };
      detail = payload.detail ?? detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
};

const mapStatus = (backendStatus: string): Complaint["status"] => {
  const s = (backendStatus || "").toLowerCase();
  if (s === "open" || s === "pending") return "Open";
  if (s === "vendor_assigned" || s === "assigned") return "Assigned";
  if (s === "in_progress" || s === "in progress") return "In Progress";
  if (s === "done" || s === "fixed") return "Fixed";
  if (s === "closed" || s === "resolved" || s === "cancelled") return "Closed";
  return "Open";
};

const mapComplaint = (c: any): Complaint => {
  if (!c) return c;
  return {
    ...c,
    status: mapStatus(c.status),
    priority: (c.priority ? c.priority.charAt(0).toUpperCase() + c.priority.slice(1) : "Medium") as Complaint["priority"],
  };
};

export const getComplaints = async (options?: {
  status?: string;
  assignedTo?: string;
  createdBy?: string;
  location?: string;
  departmentId?: string;
  assignedVendorId?: string;
}) => {
  const data = await request<Complaint[]>("/complaints", {
    query: {
      status: options?.status,
      assignedTo: options?.assignedTo,
      createdBy: options?.createdBy,
      location: options?.location,
      departmentId: options?.departmentId,
      assignedVendorId: options?.assignedVendorId,
    },
  });
  return data.map(mapComplaint);
};

export const getComplaint = async (complaintId: string) => {
  const data = await request<Complaint>(`/complaints/${complaintId}`);
  return mapComplaint(data);
};

export const createComplaint = async (payload: {
  location: string;
  departmentId: string;
  title: string;
  description: string;
  priority: string;
  createdBy: string;
  images?: string[];
}) => {
  const data = await request<Complaint>("/complaints", { method: "POST", body: payload });
  return mapComplaint(data);
};

export const updateComplaint = async (
  complaintId: string,
  payload: {
    title?: string;
    description?: string;
    location?: string;
    priority?: string;
  }
) => {
  const data = await request<Complaint>(`/complaints/${complaintId}`, {
    method: "PATCH",
    body: payload,
  });
  return mapComplaint(data);
};

export const assignVendor = async (complaintId: string, vendor: string) => {
  const data = await request<Complaint>(`/complaints/${complaintId}/assign`, {
    method: "POST",
    body: { vendor },
  });
  return mapComplaint(data);
};

export const markFixed = async (complaintId: string, remarks?: string, image?: string) => {
  const data = await request<Complaint>(`/complaints/${complaintId}/mark-fixed`, {
    method: "POST",
    body: { remarks, image },
  });
  return mapComplaint(data);
};

export const requestVendorChange = async (complaintId: string, reason: string) => {
  const data = await request<Complaint>(`/complaints/${complaintId}/request-vendor-change`, {
    method: "POST",
    body: { reason },
  });
  return mapComplaint(data);
};

export const verifySolution = async (complaintId: string) => {
  const data = await request<Complaint>(`/complaints/${complaintId}/verify-solution`, {
    method: "POST",
  });
  return mapComplaint(data);
};

export const notifyVendor = async (complaintId: string) => {
  const data = await request<Complaint>(`/complaints/${complaintId}/notify-vendor`, {
    method: "POST",
  });
  return mapComplaint(data);
};

export const closeComplaint = async (complaintId: string, reason: string) => {
  const data = await request<Complaint>(`/complaints/${complaintId}/close`, {
    method: "POST",
    body: { reason },
  });
  return mapComplaint(data);
};

export const sendReminder = async (complaintId: string) => {
  const data = await request<Complaint>(`/complaints/${complaintId}/remind`, {
    method: "POST",
  });
  return mapComplaint(data);
};

export const generateOtp = (complaintId: string) =>
  request<{ otp: string; expiresAt: string }>(`/complaints/${complaintId}/otp`, {
    method: "POST",
  });

export const verifyOtp = async (complaintId: string, otp: string) => {
  const data = await request<Complaint>(`/complaints/${complaintId}/verify-otp`, {
    method: "POST",
    body: { otp },
  });
  return mapComplaint(data);
};

export const reportIssue = (complaintId: string, reason: string, details?: string) =>
  request<{ status: string }>(`/complaints/${complaintId}/report`, {
    method: "POST",
    body: { reason, details },
  });

export const getVendors = (options?: { departmentId?: string }) =>
  request<VendorItem[]>("/vendors", {
    query: {
      departmentId: options?.departmentId,
    },
  });

export const addVendor = (payload: { email: string; name: string; departmentId: string }) =>
  request<VendorItem>("/vendors", {
    method: "POST",
    body: payload,
  });

export const removeVendor = (vendorId: string, departmentId?: string) =>
  request<{ status: string }>(`/vendors/${vendorId}/remove`, {
    method: "POST",
    query: { departmentId },
  });

export const getNotifications = (limit = 10, userId?: string) =>
  request<NotificationItem[]>("/notifications", {
    query: { limit, userId },
  });

export const deleteNotification = (notificationId: string) =>
  request<{ status: string }>(`/notifications/${notificationId}`, {
    method: "DELETE",
  });

export const getStats = async (options?: {
  createdBy?: string;
  departmentId?: string;
  assignedVendorId?: string;
}) => {
  const response = await request<{ stats: StatItem[]; avgResolutionTime?: number }>("/stats", {
    query: {
      createdBy: options?.createdBy,
      departmentId: options?.departmentId,
      assignedVendorId: options?.assignedVendorId,
    },
  });
  return response;
};

export const getCategories = () => request<string[]>("/meta/categories");

export const getUserByFirebaseUid = (firebaseUid: string, token?: string) =>
  request<{
    id: string;
    firebaseUid: string;
    name: string;
    avatarUrl?: string | null;
    email: string;
    role: string;
    departmentId?: string | null;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>(`/users/firebase/${firebaseUid}`, { token });

export const createUser = (
  payload: {
    firebaseUid: string;
    name: string;
    avatarUrl?: string | null;
    email: string;
    role: string;
    departmentId?: string | null;
    isVerified?: boolean;
    isActive?: boolean;
  },
  token?: string
) => request<{
  id: string;
  firebaseUid: string;
  name: string;
  avatarUrl?: string | null;
  email: string;
  role: string;
  departmentId?: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}>("/users", { method: "POST", body: payload, token });

export const updateUserByFirebaseUid = (
  firebaseUid: string,
  payload: {
    name?: string;
    avatarUrl?: string | null;
    email?: string;
    role?: string;
    departmentId?: string | null;
    isVerified?: boolean;
    isActive?: boolean;
  },
  token?: string
) =>
  request<{
    id: string;
    firebaseUid: string;
    name: string;
    avatarUrl?: string | null;
    email: string;
    role: string;
    departmentId?: string | null;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>(`/users/firebase/${firebaseUid}`, {
    method: "PATCH",
    body: payload,
    token,
  });

export const triggerSosAlert = (payload: {
  triggeredBy: string;
  emergencyType: string;
  location?: string;
  description?: string;
}) =>
  request<{ status: string }>("/sos/alert", {
    method: "POST",
    body: payload,
  });

export const getUserByEmail = (email: string, token?: string) =>
  request<{
    id: string;
    firebaseUid?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
    email: string;
    role?: string | null;
    departmentId?: string | null;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>(`/users/email/${encodeURIComponent(email)}`, { token });

export const updateUserById = (
  userId: string,
  payload: {
    firebaseUid?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
    email?: string;
    role?: string | null;
    departmentId?: string | null;
    isVerified?: boolean;
    isActive?: boolean;
  },
  token?: string
) =>
  request<{
    id: string;
    firebaseUid?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
    email: string;
    role?: string | null;
    departmentId?: string | null;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>(`/users/id/${userId}`, {
    method: "PATCH",
    body: payload,
    token,
  });

export type SosAlertHistoryItem = {
  id: string;
  triggeredBy: string;
  triggeredByName: string;
  triggeredByEmail: string;
  location?: string | null;
  message?: string | null;
  status: string;
  createdAt: string;
  closedAt?: string | null;
};

export const getSosHistory = () =>
  request<SosAlertHistoryItem[]>("/sos/history");

export const resolveSosAlert = (alertId: string) =>
  request<{ status: string }>(`/sos/${alertId}/resolve`, {
    method: "POST",
  });

export const deleteComplaint = (complaintId: string) =>
  request<void>(`/complaints/${complaintId}`, { method: "DELETE" });

export const getReports = (options: {
  userId: string;
  role: string;
  departmentId?: string;
  vendorId?: string;
}) =>
  request<ReportItem[]>("/complaints/reports", {
    query: {
      userId: options.userId,
      role: options.role,
      departmentId: options.departmentId,
      vendorId: options.vendorId,
    },
  });

export const registerFCMToken = (userId: string, token: string) =>
  request<{ status: string }>("/notifications/register-token", {
    method: "POST",
    body: { userId, token },
  });

export const unregisterFCMToken = (token: string) =>
  request<{ status: string }>("/notifications/unregister-token", {
    method: "POST",
    body: { token },
  });

export const registerOrganization = (payload: {
  orgName: string;
  orgCode: string;
  adminName: string;
  adminEmail: string;
  firebaseUid: string;
}) =>
  request<any>("/organizations/register", {
    method: "POST",
    body: payload,
  });

export const getOrganizationById = (orgId: string, token?: string) =>
  request<any>(`/organizations/id/${orgId}`, { token });

export const updateBranding = (payload: { name?: string; logoUrl?: string }, token?: string) =>
  request<any>("/organizations/branding", {
    method: "PATCH",
    body: payload,
    token,
  });



