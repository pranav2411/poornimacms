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
  timeline?: ComplaintTimelineItem[];
  createdAt: string;
  updatedAt: string;
  workCompleted?: boolean;
  otpVerified?: boolean;
  lastReminderSent?: string;
  closeReason?: string;
};

export const facultyStats = [
  // TODO: replace with API
  { label: "Active Complaints", value: 12 },
  { label: "Resolved", value: 38 },
  { label: "Pending OTP", value: 3 },
];

export const complaints: Complaint[] = [
  // TODO: replace with API
  {
    id: "CMP-214",
    room: "A-204",
    category: "Electrical",
    title: "Tube light flickering",
    description: "Tube light in the lab flickers intermittently after 5pm.",
    status: "Assigned",
    priority: "Medium",
    assignedTo: "Ravi Electricals",
    timeline: [
      {
        label: "Complaint registered",
        time: "2026-05-27 16:10",
        remarks: "Issue verified by faculty in lab log.",
      },
      {
        label: "Vendor assigned",
        time: "2026-05-28 09:30",
        remarks: "Ravi Electricals scheduled for evening visit.",
      },
    ],
    createdAt: "2026-05-27",
    updatedAt: "2026-05-28",
    workCompleted: false,
    otpVerified: false,
  },
  {
    id: "CMP-215",
    room: "B-112",
    category: "Housekeeping",
    title: "Spill cleanup needed",
    description: "Spill near corridor benches needs cleaning.",
    status: "Pending",
    priority: "Low",
    timeline: [
      {
        label: "Complaint registered",
        time: "2026-05-28 11:05",
      },
    ],
    createdAt: "2026-05-28",
    updatedAt: "2026-05-28",
  },
  {
    id: "CMP-216",
    room: "C-305",
    category: "IT/AV",
    title: "Projector not powering",
    description: "Projector in seminar hall is not switching on.",
    status: "In Progress",
    priority: "High",
    assignedTo: "TechWave AV",
    timeline: [
      {
        label: "Complaint registered",
        time: "2026-05-26 10:30",
      },
      {
        label: "Vendor assigned",
        time: "2026-05-26 14:15",
        remarks: "TechWave AV confirmed inspection visit.",
      },
      {
        label: "Work started",
        time: "2026-05-28 09:00",
        remarks: "Power unit diagnostics in progress.",
      },
    ],
    createdAt: "2026-05-26",
    updatedAt: "2026-05-28",
  },
  {
    id: "CMP-217",
    room: "A-204",
    category: "Plumbing",
    title: "Low water pressure",
    description: "Restroom tap pressure is too low for students.",
    status: "Fixed",
    priority: "Medium",
    assignedTo: "FlowFix Plumbing",
    timeline: [
      {
        label: "Complaint registered",
        time: "2026-05-24 08:50",
      },
      {
        label: "Vendor assigned",
        time: "2026-05-24 11:20",
        remarks: "FlowFix Plumbing assigned for same day visit.",
      },
      {
        label: "Work completed",
        time: "2026-05-27 15:40",
        remarks: "Pressure restored; replaced faulty valve.",
      },
    ],
    createdAt: "2026-05-24",
    updatedAt: "2026-05-27",
    workCompleted: true,
    otpVerified: false,
  },
  {
    id: "CMP-218",
    room: "D-101",
    category: "Carpentry",
    title: "Broken desk hinge",
    description: "Desk hinge snapped, needs replacement.",
    status: "Closed",
    priority: "Low",
    assignedTo: "WoodCare",
    timeline: [
      {
        label: "Complaint registered",
        time: "2026-05-22 09:15",
      },
      {
        label: "Vendor assigned",
        time: "2026-05-22 12:05",
        remarks: "WoodCare scheduled onsite inspection.",
      },
      {
        label: "Work completed",
        time: "2026-05-25 16:20",
        remarks: "Hinge replaced and desk reinforced.",
      },
      {
        label: "Complaint closed",
        time: "2026-05-26 10:10",
        remarks: "Admin verified replacement and approved closure.",
      },
    ],
    createdAt: "2026-05-22",
    updatedAt: "2026-05-26",
    workCompleted: true,
    otpVerified: true,
  },
];

export const vendors = [
  // TODO: replace with API
  "Ravi Electricals",
  "FlowFix Plumbing",
  "WoodCare",
  "TechWave AV",
  "Sparkline Services",
];

export const notifications = [
  // TODO: replace with API
  {
    id: "NTF-01",
    title: "CMP-216 vendor assigned",
    timestamp: "5m ago",
  },
  {
    id: "NTF-02",
    title: "CMP-214 complaint rejected",
    timestamp: "25m ago",
  },
  {
    id: "NTF-03",
    title: "CMP-215 marked completed",
    timestamp: "1h ago",
  },
];

export const categories = [
  "Electrical",
  "Plumbing",
  "Carpentry",
  "IT/AV",
  "Housekeeping",
  "Other",
];
