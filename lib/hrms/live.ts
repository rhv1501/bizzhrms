import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import {
  initials,
  formatWorkHours,
  type AttendanceItem,
  type EmployeeSummary,
  type LeaveItem,
  type TaskItem,
} from "@/lib/hrms/mock";
import type { Database } from "@/types/supabase";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type AttendanceRow = Database["public"]["Tables"]["attendance"]["Row"];
type AttendanceInsert = Database["public"]["Tables"]["attendance"]["Insert"];
type AttendanceUpdate = Database["public"]["Tables"]["attendance"]["Update"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
type LeaveRow = Database["public"]["Tables"]["leaves"]["Row"];
type LeaveInsert = Database["public"]["Tables"]["leaves"]["Insert"];
type LeaveUpdate = Database["public"]["Tables"]["leaves"]["Update"];
type SettingsRow = Database["public"]["Tables"]["settings"]["Row"];
type SettingsInsert = Database["public"]["Tables"]["settings"]["Insert"];
type SettingsUpdate = Database["public"]["Tables"]["settings"]["Update"];

export type AdminDashboardSnapshot = {
  totalEmployees: number;
  presentToday: number;
  pendingLeaves: number;
  avgTaskCompletion: number;
  attendance: AttendanceItem[];
  leaveRequests: LeaveItem[];
};

export type AdminEmployeesSnapshot = {
  employees: EmployeeSummary[];
  departments: Array<{ name: string; employees: number; occupancy: number }>;
  attendance: AttendanceItem[];
};

export type AdminTasksSnapshot = {
  tasks: TaskItem[];
  employees: UserRow[];
};

export type AdminLeaveSnapshot = {
  requests: LeaveItem[];
};

export type EmployeeTasksSnapshot = {
  tasks: TaskItem[];
};

export type EmployeeHistorySnapshot = {
  attendance: AttendanceItem[];
};

export type EmployeeDashboardSnapshot = {
  tasks: TaskItem[];
  attendance: AttendanceItem[];
  leaveBalance: number;
};

export type SettingsSnapshot = {
  settings: SettingsRow | null;
};

export type ClockLocation = {
  latitude: number;
  longitude: number;
  locationName?: string | null;
};

function getClient() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  return createClient();
}

function displayName(user: Pick<UserRow, "full_name" | "email"> | undefined, fallback = "Unknown") {
  if (user?.full_name) {
    return user.full_name;
  }

  if (user?.email) {
    return user.email.split("@")[0]?.replace(/[._-]/g, " ") ?? fallback;
  }

  return fallback;
}

function formatClockLabel(value: string | null | undefined) {
  if (!value) {
    return "--:--";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayLabel(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: parsed.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function makeAttendanceItem(
  row: AttendanceRow,
  user: UserRow | undefined,
): AttendanceItem {
  const start = row.clock_in_time ? new Date(row.clock_in_time) : null;
  const end = row.clock_out_time ? new Date(row.clock_out_time) : null;
  const hours = start && end ? Math.max(0, (end.getTime() - start.getTime()) / 3_600_000) : 0;

  return {
    id: row.id,
    employee: displayName(user),
    department: user?.department ?? "Unknown",
    clockIn: formatClockLabel(row.clock_in_time),
    clockOut: formatClockLabel(row.clock_out_time),
    hours,
    status: (row.status as any) ?? "Absent",
    location: row.latitude !== null && row.longitude !== null ? {
      latitude: row.latitude,
      longitude: row.longitude,
      locationName: row.location_name,
    } : null,
  };
}

function makeLeaveItem(row: LeaveRow, user: UserRow | undefined): LeaveItem {
  return {
    id: row.id,
    employee: displayName(user),
    type: row.leave_type,
    reason: row.reason ?? "",
    range: row.start_date === row.end_date ? formatDayLabel(row.start_date) : `${formatDayLabel(row.start_date)} - ${formatDayLabel(row.end_date)}`,
    status: row.status as any,
  };
}

function makeTaskItem(row: TaskRow, user: UserRow | undefined): TaskItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    priority: row.priority as any,
    status: row.status as any,
    assignee: displayName(user),
    deadline: row.deadline ? formatDayLabel(row.deadline) : "No deadline",
    progress: row.status === "completed" ? 100 : row.status === "in_progress" ? 60 : 20,
  };
}

async function fetchUsers() {
  const client = getClient();

  if (!client) {
    return [] as UserRow[];
  }

  const { data } = await client.from("users").select("*");

  return data ?? [];
}

function userById(users: UserRow[], userId: string | null | undefined) {
  return users.find((user) => user.id === userId);
}

function activeEmployees(users: UserRow[]) {
  return users.filter((user) => user.role !== "admin");
}

async function loadSingleSettingsRow() {
  const client = getClient();

  if (!client) {
    return null;
  }

  const { data } = await client.from("settings").select("*").limit(1).maybeSingle();

  return (data ?? null) as SettingsRow | null;
}

export async function loadSettingsSnapshot(): Promise<SettingsSnapshot> {
  return {
    settings: await loadSingleSettingsRow(),
  };
}

export async function updateSettings(input: Partial<SettingsRow>) {
  const client = getClient();

  if (!client) {
    return null;
  }

  const current = await loadSingleSettingsRow();
  const payload: SettingsInsert = {
    office_start_time: input.office_start_time,
    office_end_time: input.office_end_time,
    min_work_hours: input.min_work_hours,
    allowed_clock_in_window_minutes: input.allowed_clock_in_window_minutes,
    geolocation_enabled: input.geolocation_enabled,
    browser_notifications_enabled: input.browser_notifications_enabled,
    enforce_task_completion: input.enforce_task_completion,
    updated_at: new Date().toISOString(),
  };

  if (!current) {
    const { data, error } = await client.from("settings").insert(payload as never).select("*").maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  const updatePayload: SettingsUpdate = {
    ...payload,
  };

  const { data, error } = await client
    .from("settings")
    .update(updatePayload as never)
    .eq("id", current.id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function loadAdminDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
  const client = getClient();

  if (!client) {
    return {
      totalEmployees: 0,
      presentToday: 0,
      pendingLeaves: 0,
      avgTaskCompletion: 0,
      attendance: [],
      leaveRequests: [],
    };
  }

  const usersPromise = client.from("users").select("*");
  const today = new Date().toISOString().slice(0, 10);
  const attendancePromise = client
    .from("attendance")
    .select("*")
    .eq("date", today)
    .order("clock_in_time", { ascending: false });
  const leavePromise = client
    .from("leaves")
    .select("*")
    .order("applied_at", { ascending: false });
  const taskPromise = client.from("tasks").select("*");
  const [{ data: users }, { data: attendanceRows }, { data: leaveRows }, { data: taskRows }] =
    await Promise.all([usersPromise, attendancePromise, leavePromise, taskPromise]);

  const userList = (users ?? []) as UserRow[];
  const employees = activeEmployees(userList);
  const attendanceRowsTyped = (attendanceRows ?? []) as AttendanceRow[];
  const leaveRowsTyped = (leaveRows ?? []) as LeaveRow[];
  const taskRowsTyped = (taskRows ?? []) as TaskRow[];

  const attendance = attendanceRowsTyped.map((row) =>
    makeAttendanceItem(row, userById(userList, row.user_id)),
  );
  const leaveRequests = leaveRowsTyped.map((row) =>
    makeLeaveItem(row, userById(userList, row.user_id)),
  );

  const employeeIds = new Set(employees.map((employee) => employee.id));
  const employeeAttendanceRows = attendanceRowsTyped.filter((row) => employeeIds.has(row.user_id));
  const employeeLeaveRows = leaveRowsTyped.filter((row) => employeeIds.has(row.user_id));
  const employeeTasks = taskRowsTyped.filter((task) => employeeIds.has(task.user_id));
  const completedTasks = employeeTasks.filter((task) => task.status === "completed").length;
  const taskCompletion = employeeTasks.length > 0 ? Math.round((completedTasks / employeeTasks.length) * 100) : 0;

  return {
    totalEmployees: employees.length,
    presentToday: employeeAttendanceRows.filter((item) => item.status !== "Absent").length,
    pendingLeaves: employeeLeaveRows.filter((item) => item.status === "pending").length,
    avgTaskCompletion: taskCompletion,
    attendance,
    leaveRequests,
  };
}

export async function loadAdminEmployeesSnapshot(): Promise<AdminEmployeesSnapshot> {
  const client = getClient();

  if (!client) {
    return {
      employees: [],
      departments: [],
      attendance: [],
    };
  }

  const users = await fetchUsers();
  const taskRowsPromise = client.from("tasks").select("*");
  const attendanceRowsPromise = client
    .from("attendance")
    .select("*")
    .order("date", { ascending: false })
    .limit(20);
  const leaveRowsPromise = client.from("leaves").select("*");

  const [{ data: taskRows }, { data: attendanceRows }, { data: leaveRows }] = await Promise.all([
    taskRowsPromise,
    attendanceRowsPromise,
    leaveRowsPromise,
  ]);

  const taskRowsTyped = (taskRows ?? []) as TaskRow[];
  const attendanceRowsTyped = (attendanceRows ?? []) as AttendanceRow[];
  const leaveRowsTyped = (leaveRows ?? []) as LeaveRow[];

  const taskLookup = new Map<string, TaskRow[]>();
  taskRowsTyped.forEach((task) => {
    const current = taskLookup.get(task.user_id) ?? [];
    current.push(task);
    taskLookup.set(task.user_id, current);
  });

  const attendanceLookup = new Map<string, AttendanceRow[]>();
  attendanceRowsTyped.forEach((entry) => {
    const current = attendanceLookup.get(entry.user_id) ?? [];
    current.push(entry);
    attendanceLookup.set(entry.user_id, current);
  });

  const leaveLookup = new Map<string, LeaveRow[]>();
  leaveRowsTyped.forEach((entry) => {
    const current = leaveLookup.get(entry.user_id) ?? [];
    current.push(entry);
    leaveLookup.set(entry.user_id, current);
  });

  const liveUsers = activeEmployees(users);

  const liveEmployees = liveUsers.length > 0
    ? liveUsers.map((user, index) => {
        const latestAttendance = attendanceLookup.get(user.id)?.[0];
        const userTasks = taskLookup.get(user.id) ?? [];
        const completedTasks = userTasks.filter((task) => task.status === "completed").length;
        const approvedLeaves = (leaveLookup.get(user.id) ?? []).filter((leave) => leave.status === "approved").length;

        return {
          id: user.id,
          name: displayName(user, "Employee"),
          email: user.email,
          role: user.role as any,
          department: user.department ?? "General",
          title: user.role === "admin" ? "Administrator" : "Team Member",
          status: latestAttendance?.status === "Absent" ? "On Leave" : "Active",
          attendance: (latestAttendance?.status as any) ?? "Absent",
          clockIn: latestAttendance ? formatClockLabel(latestAttendance.clock_in_time) : "--:--",
          hours: latestAttendance
            ? Math.max(
                0,
                (latestAttendance.clock_out_time && latestAttendance.clock_in_time
                  ? new Date(latestAttendance.clock_out_time).getTime() -
                    new Date(latestAttendance.clock_in_time).getTime()
                  : 0) / 3_600_000,
              )
            : 0,
          taskCompletion: userTasks.length > 0 ? Math.round((completedTasks / userTasks.length) * 100) : 0,
          leaveBalance: Math.max(0, 24 - approvedLeaves),
          employeeType: user.employee_type as "full-time" | "intern" || "full-time",
        } satisfies EmployeeSummary;
      })
    : [];

  const departments = Array.from(
    liveEmployees.reduce((acc, employee) => {
      const current = acc.get(employee.department) ?? { name: employee.department, employees: 0, occupancy: 0 };
      current.employees += 1;
      acc.set(employee.department, current);
      return acc;
    }, new Map<string, { name: string; employees: number; occupancy: number }>()),
  ).map(([, department], index) => ({
    ...department,
    occupancy: Math.max(
      60,
      Math.min(
        100,
        Math.round(
          85 + ((department.employees / Math.max(1, liveEmployees.length)) * 15) - index,
        ),
      ),
    ),
  }));

  const liveAttendance = attendanceRowsTyped.map((row) =>
    makeAttendanceItem(row, userById(users, row.user_id)),
  );

  return {
    employees: liveEmployees,
    departments: departments.length > 0 ? departments : [],
    attendance: liveAttendance,
  };
}

export async function loadAdminTasksSnapshot(): Promise<AdminTasksSnapshot> {
  const client = getClient();

  if (!client) {
    return {
      tasks: [],
      employees: [],
    };
  }

  const users = await fetchUsers();
  const { data: taskRows } = await client.from("tasks").select("*").order("created_at", { ascending: false });

  const taskRowsTyped = (taskRows ?? []) as TaskRow[];

  return {
    tasks: taskRowsTyped.map((row) => makeTaskItem(row, userById(users, row.user_id))),
    employees: users,
  };
}

export async function loadAdminLeaveSnapshot(): Promise<AdminLeaveSnapshot> {
  const client = getClient();

  if (!client) {
    return { requests: [] };
  }

  const users = await fetchUsers();
  const { data: leaveRows } = await client.from("leaves").select("*").order("applied_at", { ascending: false });
  const leaveRowsTyped = (leaveRows ?? []) as LeaveRow[];

  return {
    requests: leaveRowsTyped.map((row) => makeLeaveItem(row, userById(users, row.user_id))),
  };
}

export async function loadEmployeeTasksSnapshot(userId: string): Promise<EmployeeTasksSnapshot> {
  const client = getClient();

  if (!client) {
    return { tasks: [] };
  }

  const users = await fetchUsers();
  const { data: taskRows } = await client
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const taskRowsTyped = (taskRows ?? []) as TaskRow[];

  return {
    tasks: taskRowsTyped.map((row) => makeTaskItem(row, userById(users, row.user_id))),
  };
}

export async function loadEmployeeHistorySnapshot(userId: string): Promise<EmployeeHistorySnapshot> {
  const client = getClient();

  if (!client) {
    return { attendance: [] };
  }

  const users = await fetchUsers();
  const { data: attendanceRows } = await client
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  const attendanceRowsTyped = (attendanceRows ?? []) as AttendanceRow[];

  return {
    attendance: attendanceRowsTyped.map((row) => makeAttendanceItem(row, userById(users, row.user_id))),
  };
}

export async function loadEmployeeDashboardSnapshot(userId: string): Promise<EmployeeDashboardSnapshot> {
  const client = getClient();

  if (!client) {
    return {
      tasks: [],
      attendance: [],
      leaveBalance: 0,
    };
  }

  const tasksSnapshot = await loadEmployeeTasksSnapshot(userId);
  const historySnapshot = await loadEmployeeHistorySnapshot(userId);
  const { data: leaveRows } = await client
    .from("leaves")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "approved");

  return {
    tasks: tasksSnapshot.tasks,
    attendance: historySnapshot.attendance,
    leaveBalance: Math.max(0, 24 - (leaveRows?.length ?? 0)),
  };
}

export async function clockInAttendance(userId: string, location?: ClockLocation) {
  const client = getClient();

  if (!client) {
    return null;
  }

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const { data: existing } = await client
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  if (existing) {
    const existingRow = existing as AttendanceRow;
    const updatePayload: AttendanceUpdate = {
      clock_in_time: existingRow.clock_in_time ?? now,
      status: "On Time",
      latitude: location?.latitude ?? existingRow.latitude ?? null,
      longitude: location?.longitude ?? existingRow.longitude ?? null,
      location_name: location?.locationName ?? existingRow.location_name ?? null,
    };
    const { data: updated, error } = await client
      .from("attendance")
      .update(updatePayload as never)
      .eq("id", existingRow.id)
      .select("*")
      .maybeSingle();

    if (error) {
      throw error;
    }

    // notify user about successful clock-in (best-effort)
    try {
      await client.from("notifications").insert({
        user_id: userId,
        title: "Clock In",
        body: `You clocked in at ${new Date().toLocaleTimeString()}`,
        type: "attendance",
      } as never);

      fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, title: "Clock In", message: "You have successfully clocked in" }),
      }).catch(() => {});
    } catch (e) {
      console.warn("clockin notification failed", e);
    }

    return updated;
  }

  const insertPayload: AttendanceInsert = {
    user_id: userId,
    date: today,
    clock_in_time: now,
    status: "On Time",
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    location_name: location?.locationName ?? null,
  };

  const { data, error } = await client
    .from("attendance")
    .insert(insertPayload as never)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  try {
    await client.from("notifications").insert({
      user_id: userId,
      title: "Clock In",
      body: `You clocked in at ${new Date().toLocaleTimeString()}`,
      type: "attendance",
    } as never);

    fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title: "Clock In", message: "You have successfully clocked in" }),
    }).catch(() => {});
  } catch (e) {
    console.warn("clockin notification failed", e);
  }

  return data;
}

export async function clockOutAttendance(userId: string, location?: ClockLocation) {
  const client = getClient();

  if (!client) {
    return null;
  }

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const { data: existing } = await client
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  if (!existing) {
    return null;
  }

  const existingRow = existing as AttendanceRow;
  const updatePayload: AttendanceUpdate = {
    clock_out_time: now,
    latitude: location?.latitude ?? existingRow.latitude ?? null,
    longitude: location?.longitude ?? existingRow.longitude ?? null,
    location_name: location?.locationName ?? existingRow.location_name ?? null,
  };

  const { data, error } = await client
    .from("attendance")
    .update(updatePayload as never)
    .eq("id", existingRow.id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  // notify user about successful clock-out (best-effort)
  try {
    await client.from("notifications").insert({
      user_id: userId,
      title: "Clock Out",
      body: `You clocked out at ${new Date().toLocaleTimeString()}`,
      type: "attendance",
    } as never);

    fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title: "Clock Out", message: "You have successfully clocked out" }),
    }).catch(() => {});
  } catch (e) {
    console.warn("clockout notification failed", e);
  }

  return data;
}

export async function createTaskAssignment(input: {
  userId: string;
  title: string;
  description?: string;
  priority: "Low" | "Medium" | "High";
  deadline?: string;
}) {
  const client = getClient();

  if (!client) {
    return null;
  }

  const insertPayload: TaskInsert = {
    user_id: input.userId,
    title: input.title,
    description: input.description ?? null,
    priority: input.priority,
    status: "pending",
    deadline: input.deadline ?? null,
  };

  const { error } = await client
    .from("tasks")
    .insert(insertPayload as never);

  if (error) {
    throw error;
  }

  // create a notification for the assignee and attempt push send (best-effort)
  try {
    await client.from("notifications").insert({
      user_id: input.userId,
      title: `New task: ${input.title}`,
      body: input.description ?? "You have a new task assigned.",
      type: "task",
    } as never);

    fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: input.userId, title: `New task: ${input.title}`, message: input.description ?? "You have a new task assigned.", url: "/dashboard/employee/tasks" }),
    }).catch(() => {});
  } catch (e) {
    console.warn("task notification failed", e);
  }

  return true;
}

export async function updateTaskStatus(taskId: string, status: "pending" | "in_progress" | "completed") {
  const client = getClient();

  if (!client) {
    return null;
  }

  const updatePayload: TaskUpdate = { status };

  const { data, error } = await client
    .from("tasks")
    .update(updatePayload as never)
    .eq("id", taskId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data && status === "completed") {
    // Notify admin that task was completed
    try {
      await client.from("notifications").insert({
        title: `Task Completed`,
        body: `A task was marked as completed.`,
        type: "task",
      } as never);

      fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: null, title: `Task Completed`, message: `A task was marked as completed by the assigned employee.`, url: "/dashboard/admin/tasks" }),
      }).catch(() => {});
    } catch (e) {
      console.warn("task completion notification failed", e);
    }
  }

  return data;
}

export async function createLeaveRequest(input: {
  userId: string;
  leaveType: string;
  reason?: string;
  startDate: string;
  endDate: string;
}) {
  const client = getClient();

  if (!client) {
    return null;
  }

  const insertPayload: LeaveInsert = {
    user_id: input.userId,
    leave_type: input.leaveType,
    reason: input.reason ?? null,
    start_date: input.startDate,
    end_date: input.endDate,
    status: "pending",
  };

  const { data, error } = await client
    .from("leaves")
    .insert(insertPayload as never)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  // notify admins about new leave request (best-effort)
  try {
    await client.from("notifications").insert({
      title: `Leave request: ${input.leaveType}`,
      body: `Leave request submitted by user ${input.userId}`,
      type: "leave",
    } as never);

    fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: null, title: `Leave request`, message: `A leave request was submitted` }),
    }).catch(() => {});
  } catch (e) {
    console.warn("leave notification failed", e);
  }

  return data;
}

export async function updateLeaveStatus(leaveId: string, status: "approved" | "rejected") {
  const client = getClient();

  if (!client) {
    return null;
  }

  const updatePayload: LeaveUpdate = { status };

  const { data, error } = await client
    .from("leaves")
    .update(updatePayload as never)
    .eq("id", leaveId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data && (data as any).user_id) {
    const userId = (data as any).user_id;
    // Notify user about leave status update
    try {
      await client.from("notifications").insert({
        user_id: userId,
        title: `Leave Request ${status === "approved" ? "Approved" : "Rejected"}`,
        body: `Your leave request has been ${status}.`,
        type: "leave",
      } as never);

      fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId, title: `Leave ${status === "approved" ? "Approved" : "Rejected"}`, message: `Your leave request has been ${status} by the admin.`, url: "/dashboard/employee/leave" }),
      }).catch(() => {});
    } catch (e) {
      console.warn("leave status notification failed", e);
    }
  }

  return data;
}

export { initials, formatWorkHours };

export async function deleteTask(taskId: string) {
  const client = getClient();
  if (!client) return null;
  const { error } = await client.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
  return true;
}

export async function deleteLeaveRequest(leaveId: string) {
  const client = getClient();
  if (!client) return null;
  const { data: leave } = await client.from("leaves").select("status").eq("id", leaveId).single();
  if ((leave as unknown as { status: string })?.status === "approved") {
    throw new Error("Cannot delete an approved leave request.");
  }
  const { error } = await client.from("leaves").delete().eq("id", leaveId);
  if (error) throw error;
  return true;
}

export async function updateLeaveRequest(leaveId: string, input: { leaveType?: string; reason?: string; startDate?: string; endDate?: string }) {
  const client = getClient();
  if (!client) return null;
  const { data: leave } = await client.from("leaves").select("status").eq("id", leaveId).single();
  if ((leave as unknown as { status: string })?.status === "approved") {
    throw new Error("Cannot edit an approved leave request.");
  }
  const updatePayload: any = {};
  if (input.leaveType) updatePayload.leave_type = input.leaveType;
  if (input.reason) updatePayload.reason = input.reason;
  if (input.startDate) updatePayload.start_date = input.startDate;
  if (input.endDate) updatePayload.end_date = input.endDate;

  const { data, error } = await client.from("leaves").update(updatePayload as never).eq("id", leaveId).select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export async function editTask(taskId: string, input: { title?: string; description?: string; priority?: string; deadline?: string }) {
  const client = getClient();
  if (!client) return null;
  const updatePayload: any = {};
  if (input.title) updatePayload.title = input.title;
  if (input.description !== undefined) updatePayload.description = input.description;
  if (input.priority) updatePayload.priority = input.priority;
  if (input.deadline !== undefined) updatePayload.deadline = input.deadline;
  
  const { data, error } = await client.from("tasks").update(updatePayload as never).eq("id", taskId).select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export type EmployeeLeavesSnapshot = {
  requests: import("@/lib/hrms/mock").LeaveItem[];
};

export async function loadEmployeeLeavesSnapshot(userId: string): Promise<EmployeeLeavesSnapshot> {
  const client = getClient();
  if (!client) return { requests: [] };
  const { data: leaveRows } = await client.from("leaves").select("*").eq("user_id", userId).order("applied_at", { ascending: false });
  // wait, I need users to resolve displayName, but for employee themselves I could just use their own user.
  // let's just fetch their user or fetch all users like others.
  const users = await fetchUsers();
  const leaveRowsTyped = (leaveRows ?? []) as any[];
  return {
    requests: leaveRowsTyped.map((row) => makeLeaveItem(row, userById(users, row.user_id))),
  };
}

export type AnnouncementItem = {
  id: string;
  title: string;
  content: string;
  type: string;
  author: string;
  createdAt: string;
};

export async function loadAnnouncements(): Promise<AnnouncementItem[]> {
  const client = getClient();
  if (!client) return [];
  const { data: rows } = await client.from("announcements" as any).select("*").order("created_at", { ascending: false });
  const users = await fetchUsers();
  const rowsTyped = (rows ?? []) as any[];
  return rowsTyped.map(row => ({
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    author: displayName(userById(users, row.author_id)),
    createdAt: row.created_at,
  }));
}

export async function createAnnouncement(input: { title: string; content: string; type: string }) {
  const client = getClient();
  if (!client) return null;
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await client.from("announcements" as any).insert({
    title: input.title,
    content: input.content,
    type: input.type,
    author_id: user.id,
  } as any).select("*").maybeSingle();
  if (error) throw error;
  return data;
}