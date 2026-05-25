export type AttendanceStatus = "On Time" | "Late" | "Half Day" | "Absent";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type LeaveStatus = "pending" | "approved" | "rejected";

export type EmployeeSummary = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  department: string;
  title: string;
  status: "Active" | "On Leave" | "Remote";
  attendance: AttendanceStatus;
  clockIn: string;
  hours: number;
  taskCompletion: number;
  leaveBalance: number;
  employeeType: "full-time" | "intern";
};

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High";
  status: TaskStatus;
  assignee: string;
  deadline: string;
  progress: number;
};

export type LeaveItem = {
  id: string;
  employee: string;
  type: string;
  reason: string;
  range: string;
  status: LeaveStatus;
};

export type AttendanceItem = {
  id: string;
  employee: string;
  department: string;
  clockIn: string;
  clockOut: string;
  hours: number;
  status: AttendanceStatus;
  location?: { latitude: number; longitude: number; locationName?: string | null } | null;
};

export type NotificationItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  tone: "info" | "success" | "warning";
};

export const departments = [
  { name: "Engineering", employees: 42, occupancy: 93 },
  { name: "Operations", employees: 18, occupancy: 87 },
  { name: "Sales", employees: 26, occupancy: 91 },
  { name: "HR & Admin", employees: 11, occupancy: 100 },
];

export const employees: EmployeeSummary[] = [
  {
    id: "emp-101",
    name: "John Doe",
    email: "john.doe@bizzgrow.com",
    role: "employee",
    department: "Engineering",
    title: "Frontend Engineer",
    status: "Active",
    attendance: "On Time",
    clockIn: "08:48 AM",
    hours: 8.4,
    taskCompletion: 94,
    leaveBalance: 11,
    employeeType: "full-time",
  },
  {
    id: "emp-102",
    name: "Jane Smith",
    email: "jane.smith@bizzgrow.com",
    role: "employee",
    department: "Operations",
    title: "Operations Manager",
    status: "Remote",
    attendance: "Late",
    clockIn: "09:14 AM",
    hours: 7.7,
    taskCompletion: 88,
    leaveBalance: 8,
    employeeType: "full-time",
  },
  {
    id: "emp-103",
    name: "Mike Johnson",
    email: "mike.johnson@bizzgrow.com",
    role: "employee",
    department: "Sales",
    title: "Account Executive",
    status: "On Leave",
    attendance: "Half Day",
    clockIn: "09:00 AM",
    hours: 4,
    taskCompletion: 100,
    leaveBalance: 14,
    employeeType: "full-time",
  },
  {
    id: "emp-104",
    name: "Sarah Williams",
    email: "sarah.williams@bizzgrow.com",
    role: "admin",
    department: "HR & Admin",
    title: "HR Lead",
    status: "Active",
    attendance: "On Time",
    clockIn: "08:55 AM",
    hours: 8.2,
    taskCompletion: 97,
    leaveBalance: 9,
    employeeType: "full-time",
  },
];

export const tasks: TaskItem[] = [
  {
    id: "task-1",
    title: "Prepare Q3 performance brief",
    description: "Compile weekly productivity, attendance, and leave trends for the leadership sync.",
    priority: "High",
    status: "in_progress",
    assignee: "Sarah Williams",
    deadline: "Today 5:00 PM",
    progress: 72,
  },
  {
    id: "task-2",
    title: "Resolve invoice follow-up emails",
    description: "Close outstanding vendor follow-ups and escalate anything pending beyond 48 hours.",
    priority: "Medium",
    status: "completed",
    assignee: "John Doe",
    deadline: "Today 3:00 PM",
    progress: 100,
  },
  {
    id: "task-3",
    title: "Update employee onboarding guide",
    description: "Refresh new hire instructions and attach the latest policy handbook.",
    priority: "Low",
    status: "pending",
    assignee: "Jane Smith",
    deadline: "Tomorrow 11:00 AM",
    progress: 28,
  },
  {
    id: "task-4",
    title: "Sales pipeline hygiene check",
    description: "Review active opportunities and clean duplicate records in the CRM export.",
    priority: "High",
    status: "in_progress",
    assignee: "Mike Johnson",
    deadline: "Tomorrow 4:00 PM",
    progress: 54,
  },
];

export const leaveRequests: LeaveItem[] = [
  {
    id: "leave-1",
    employee: "Mike Johnson",
    type: "Sick Leave",
    reason: "Fever and medical appointment.",
    range: "22 May - 23 May",
    status: "pending",
  },
  {
    id: "leave-2",
    employee: "Jane Smith",
    type: "Casual Leave",
    reason: "Family event out of town.",
    range: "28 May",
    status: "approved",
  },
  {
    id: "leave-3",
    employee: "John Doe",
    type: "Work From Home",
    reason: "Internet installation at home.",
    range: "30 May",
    status: "rejected",
  },
];

export const attendanceLogs: AttendanceItem[] = [
  {
    id: "att-1",
    employee: "John Doe",
    department: "Engineering",
    clockIn: "08:48 AM",
    clockOut: "05:14 PM",
    hours: 8.43,
    status: "On Time",
  },
  {
    id: "att-2",
    employee: "Jane Smith",
    department: "Operations",
    clockIn: "09:14 AM",
    clockOut: "05:33 PM",
    hours: 8.31,
    status: "Late",
  },
  {
    id: "att-3",
    employee: "Mike Johnson",
    department: "Sales",
    clockIn: "09:00 AM",
    clockOut: "01:02 PM",
    hours: 4.03,
    status: "Half Day",
  },
  {
    id: "att-4",
    employee: "Sarah Williams",
    department: "HR & Admin",
    clockIn: "08:55 AM",
    clockOut: "05:22 PM",
    hours: 8.45,
    status: "On Time",
  },
];

export const notifications: NotificationItem[] = [
  {
    id: "noti-1",
    title: "Task assignment delivered",
    description: "Quarterly performance brief assigned to Sarah Williams.",
    time: "5 min ago",
    tone: "success",
  },
  {
    id: "noti-2",
    title: "Leave request pending approval",
    description: "Mike Johnson submitted a sick leave request for review.",
    time: "21 min ago",
    tone: "warning",
  },
  {
    id: "noti-3",
    title: "Attendance reminder sent",
    description: "Employees outside the clock-in window were nudged automatically.",
    time: "45 min ago",
    tone: "info",
  },
];

export const auditLogs = [
  {
    id: "audit-1",
    actor: "Sarah Williams",
    action: "Updated office timing policy",
    detail: "Clock-in window tightened from 20 to 15 minutes.",
    time: "2 hours ago",
  },
  {
    id: "audit-2",
    actor: "Sarah Williams",
    action: "Approved leave request",
    detail: "Granted casual leave to Jane Smith for 28 May.",
    time: "4 hours ago",
  },
  {
    id: "audit-3",
    actor: "System",
    action: "Queued attendance reminder",
    detail: "Push notification sent to 11 employees nearing cutoff time.",
    time: "Today",
  },
];

export const settingsSnapshot = {
  officeStart: "09:00",
  officeEnd: "18:00",
  allowedClockInWindowMinutes: 15,
  minWorkHours: 8,
  enforceTaskCompletion: true,
  geolocationVerification: true,
  autoStatusRules: true,
};

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function formatWorkHours(hours: number) {
  return hours.toFixed(2);
}

export function canClockOut({
  completedTasks,
  totalTasks,
  hoursWorked,
  minHours,
}: {
  completedTasks: number;
  totalTasks: number;
  hoursWorked: number;
  minHours: number;
}) {
  return completedTasks >= totalTasks && hoursWorked >= minHours;
}