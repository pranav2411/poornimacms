export type ComplaintStatus =
  | "Pending"
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
  createdByName?: string;
  images?: string[];
  timeline?: ComplaintTimelineItem[];
  createdAt: string;
  updatedAt: string;
  workCompleted?: boolean;
  otpVerified?: boolean;
  lastReminderSent?: string;
  closeReason?: string;
};

export type StatItem = {
  label: string;
  value: number;
};

export type VendorItem = {
  name: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  timestamp: string;
};
