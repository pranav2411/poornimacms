export type ComplaintStatus =
  | "Pending"
  | "Open"
  | "Assigned"
  | "In Progress"
  | "Fixed"
  | "Closed";

export type ComplaintPriority = "Low" | "Medium" | "High";

export type ComplaintTimelineItem = {
  label: string;
  time: string;
  remarks?: string;
};

export type Complaint = {
  id: string;
  room: string;
  category: string;
  title: string;
  description: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assignedTo?: string;
  createdBy: string;
  createdByName?: string;
  images?: string[];
  fixImages?: string[];
  timeline?: ComplaintTimelineItem[];
  createdAt: string;
  updatedAt: string;
  workCompleted?: boolean;
  otpVerified?: boolean;
  lastReminderSent?: string;
  closeReason?: string;
  resolvedAt?: string | null;
  cancelledAt?: string | null;
  departmentId?: string | null;
};

export type StatItem = {
  label: string;
  value: number;
};

export type VendorItem = {
  id: string;
  name: string;
  email?: string;
  departmentId?: string | null;
};

export type NotificationItem = {
  id: string;
  title: string;
  timestamp: string;
};
