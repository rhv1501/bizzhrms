"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  Briefcase,
  Calendar as CalendarIcon,
  CheckCircle2,
  CheckSquare,
  Clock,
  LogOut,
  MapPin,
  RefreshCcw,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuthStore } from "@/store/useAuthStore";
import {
  clockInAttendance,
  clockOutAttendance,
  loadEmployeeDashboardSnapshot,
  loadSettingsSnapshot,
  updateTaskStatus,
  type ClockLocation,
  type EmployeeDashboardSnapshot,
  type SettingsSnapshot,
  loadAnnouncements,
  type AnnouncementItem,
} from "@/lib/hrms/live";

function getHoursWorked(clockInTime: string | null | undefined) {
  if (!clockInTime) {
    return 0;
  }

  const start = new Date(clockInTime);
  if (Number.isNaN(start.getTime())) {
    return 0;
  }

  return Math.max(0, (Date.now() - start.getTime()) / 3_600_000);
}

function getLocationLabel(location?: ClockLocation | null) {
  if (!location) {
    return "GPS captured";
  }

  if (location.locationName) {
    return location.locationName;
  }

  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

export default function EmployeeDashboard() {
  const { user } = useAuthStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dashboard, setDashboard] = useState<EmployeeDashboardSnapshot | null>(null);
  const [settings, setSettings] = useState<SettingsSnapshot | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    let mounted = true;

    Promise.all([
      loadEmployeeDashboardSnapshot(user.id),
      loadSettingsSnapshot(),
      loadAnnouncements(),
    ]).then(([employeeDashboard, settingsSnapshot, ann]) => {
      if (!mounted) {
        return;
      }

      setDashboard(employeeDashboard);
      setSettings(settingsSnapshot);
      setAnnouncements(ann);
    });

    const onRealtime = () => {
      loadEmployeeDashboardSnapshot(user.id).then((snapshot) => {
        if (mounted) {
          setDashboard(snapshot);
        }
      });
      loadAnnouncements().then((ann) => {
        if (mounted) setAnnouncements(ann);
      });
    };

    window.addEventListener("hrms:realtime", onRealtime as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener("hrms:realtime", onRealtime as EventListener);
    };
  }, [user]);

  const latestAttendance = dashboard?.attendance?.[0] ?? null;
  const tasks = dashboard?.tasks ?? [];
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const taskProgress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const workingHours = getHoursWorked(latestAttendance?.clockIn ?? null);
  const geolocationEnabled = settings?.settings?.geolocation_enabled ?? false;

  const resolveLocation = async (): Promise<ClockLocation | undefined> => {
    if (!geolocationEnabled) {
      return undefined;
    }

    if (!navigator.geolocation) {
      throw new Error("Geolocation is not supported in this browser");
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            locationName: "Current device location",
          });
        },
        () => reject(new Error("Location permission is required for attendance")),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  };

  const refreshDashboard = async () => {
    if (!user) {
      return;
    }

    const [employeeDashboard, settingsSnapshot, ann] = await Promise.all([
      loadEmployeeDashboardSnapshot(user.id),
      loadSettingsSnapshot(),
      loadAnnouncements()
    ]);

    setDashboard(employeeDashboard);
    setSettings(settingsSnapshot);
    setAnnouncements(ann);
  };

  const handleClockIn = async () => {
    if (!user) {
      return;
    }

    try {
      setIsSubmitting(true);
      const location = await resolveLocation();
      await clockInAttendance(user.id, location);
      await refreshDashboard();
      toast.success("Successfully clocked in");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to clock in");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (!user) {
      return;
    }

    try {
      if (settings?.settings?.enforce_task_completion && tasks.some((task) => task.status !== "completed")) {
        throw new Error("Complete all tasks before clocking out");
      }

      const requiredHours =
        user.employee_type === "intern"
          ? settings?.settings?.min_intern_work_hours ?? 0
          : settings?.settings?.min_work_hours ?? 0;

      if (requiredHours > 0 && workingHours < requiredHours) {
        throw new Error(`You must work at least ${requiredHours} hours before clocking out (Logged: ${workingHours.toFixed(1)}h)`);
      }

      setIsSubmitting(true);
      const location = await resolveLocation();
      await clockOutAttendance(user.id, location);
      await refreshDashboard();
      toast.success("Successfully clocked out");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to clock out");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateTaskStatus(taskId, "completed");
      await refreshDashboard();
      toast.success("Task marked complete");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to complete task");
    }
  };

  const leaveBalance = dashboard?.leaveBalance ?? 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {user?.full_name?.split(" ")[0] ?? "Employee"}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Your live schedule, attendance, and task status are synced from Supabase.
          </p>
        </div>
        <Button variant="outline" className="gap-2 w-fit" onClick={refreshDashboard} disabled={isSubmitting}>
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-1 lg:col-span-2 border-primary/20 shadow-sm bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex justify-between items-center gap-2">
              Time & Attendance
              <Badge variant={latestAttendance ? "default" : "secondary"}>
                {latestAttendance ? latestAttendance.status : "Not clocked in"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6">
              <div className="text-5xl font-bold tracking-tighter tabular-nums text-foreground/90">
                {format(currentTime, "HH:mm:ss")}
              </div>
              <div className="text-muted-foreground font-medium mt-1">
                {format(currentTime, "EEEE, MMMM do, yyyy")}
              </div>

              <div className="mt-8 flex gap-4 w-full justify-center">
                {!latestAttendance || !latestAttendance.clockIn ? (
                  <Button size="lg" className="w-full max-w-xs gap-2" onClick={handleClockIn} disabled={isSubmitting}>
                    <Clock className="w-5 h-5" />
                    Clock In Now
                  </Button>
                ) : (
                  <Button size="lg" variant="destructive" className="w-full max-w-xs gap-2" onClick={handleClockOut} disabled={isSubmitting}>
                    <LogOut className="w-5 h-5" />
                    Clock Out
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 flex flex-col gap-2 sm:flex-row sm:justify-between py-3 border-t text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Clock in: </span>
              {latestAttendance?.clockIn ?? "--:--"}
            </div>
            <div>
              <span className="font-medium text-foreground">Logged: </span>
              {workingHours.toFixed(2)} hrs
            </div>
            {latestAttendance?.clockIn && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>{getLocationLabel(latestAttendance?.location)}</span>
              </div>
            )}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Task Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {completedTasks}/{tasks.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Completed tasks today
            </p>
            <div className="mt-4">
              <Progress value={taskProgress} className="h-2" />
            </div>
            {settings?.settings?.enforce_task_completion && taskProgress < 100 && (
              <div className="mt-4 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/50 p-2 rounded-md">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>Complete all assigned tasks before clocking out.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              Leave Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{leaveBalance}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Approved leave remaining this year
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Tasks</CardTitle>
            <CardDescription>Your assigned work pulled from Supabase</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${task.status === "completed" ? "bg-green-500" : "bg-amber-500"}`} />
                      <div>
                        <p className={`text-sm font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </p>
                        <Badge variant="outline" className="mt-1 text-[10px] h-4">
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                    {task.status !== "completed" ? (
                      <Button size="sm" variant="outline" onClick={() => handleCompleteTask(task.id)}>
                        Complete
                      </Button>
                    ) : (
                      <Badge variant="default" className="rounded-full">
                        Ready
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Attendance</CardTitle>
            <CardDescription>Live session data with optional GPS verification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard?.attendance.length ? (
                dashboard.attendance.slice(0, 3).map((entry) => (
                  <div key={entry.id} className="flex items-start gap-4 pb-4 border-b last:border-b-0 last:pb-0">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <CalendarIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{entry.status}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.clockIn} → {entry.clockOut}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {entry.department} • {entry.hours.toFixed(2)} hrs
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No attendance sessions yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notice Board Widget */}
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              Notice Board
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {announcements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No recent announcements.
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.slice(0, 3).map(ann => (
                  <div key={ann.id} className="border rounded-lg p-4 bg-muted/20 relative">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={ann.type === "win" ? "default" : ann.type === "holiday" ? "destructive" : "secondary"}>
                        {ann.type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(ann.createdAt), "MMM d, yyyy")}</span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{ann.title}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ann.content}</p>
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                      <span>Posted by {ann.author}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
