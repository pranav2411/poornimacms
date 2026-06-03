import type {
  Complaint,
  NotificationItem,
  StatItem,
  VendorItem,
} from "@/lib/types";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const buildUrl = (path: string, query?: RequestOptions["query"]) => {
  const url = new URL(path, API_BASE_URL);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined) return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
    },
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

export const getComplaints = (options?: {
  status?: string;
  assignedTo?: string;
}) =>
  request<Complaint[]>("/complaints", {
    query: {
      status: options?.status,
      assignedTo: options?.assignedTo,
    },
  });

export const getComplaint = (complaintId: string) =>
  request<Complaint>(`/complaints/${complaintId}`);

export const createComplaint = (payload: {
  location: string;
  departmentId: string;
  title: string;
  description: string;
  priority: string;
  createdBy: string;
}) => request<Complaint>("/complaints", { method: "POST", body: payload });

export const assignVendor = (complaintId: string, vendor: string) =>
  request<Complaint>(`/complaints/${complaintId}/assign`, {
    method: "POST",
    body: { vendor },
  });

export const markFixed = (complaintId: string) =>
  request<Complaint>(`/complaints/${complaintId}/mark-fixed`, {
    method: "POST",
  });

export const closeComplaint = (complaintId: string, reason: string) =>
  request<Complaint>(`/complaints/${complaintId}/close`, {
    method: "POST",
    body: { reason },
  });

export const sendReminder = (complaintId: string) =>
  request<Complaint>(`/complaints/${complaintId}/remind`, {
    method: "POST",
  });

export const generateOtp = (complaintId: string) =>
  request<{ otp: string; expiresAt: string }>(`/complaints/${complaintId}/otp`, {
    method: "POST",
  });

export const verifyOtp = (complaintId: string, otp: string) =>
  request<Complaint>(`/complaints/${complaintId}/verify-otp`, {
    method: "POST",
    body: { otp },
  });

export const reportIssue = (complaintId: string, reason: string, details?: string) =>
  request<{ status: string }>(`/complaints/${complaintId}/report`, {
    method: "POST",
    body: { reason, details },
  });

export const getVendors = () => request<VendorItem[]>("/vendors");

export const getNotifications = (limit = 10) =>
  request<NotificationItem[]>("/notifications", {
    query: { limit },
  });

export const getStats = async () => {
  const response = await request<{ stats: StatItem[] }>("/stats");
  return response.stats;
};

export const getCategories = () => request<string[]>("/meta/categories");

export const getUserByFirebaseUid = (firebaseUid: string) =>
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
  }>(`/users/firebase/${firebaseUid}`);

export const createUser = (payload: {
  firebaseUid: string;
  name: string;
  avatarUrl?: string | null;
  email: string;
  role: string;
  departmentId?: string | null;
  isVerified?: boolean;
  isActive?: boolean;
}) => request<{
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
}>("/users", { method: "POST", body: payload });

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
  }
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
  });
