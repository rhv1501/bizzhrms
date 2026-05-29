"use client";

import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Download, Route, Clock3, CalendarDays } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { loadEmployeeHistorySnapshot, formatWorkHours } from "@/lib/hrms/live";
import { type AttendanceItem } from "@/lib/hrms/mock";
import { useEffect, useState } from "react";

export default function EmployeeHistoryPage() {
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);

  useEffect(() => {
    let mounted = true;
    const stored = localStorage.getItem("hrms-auth-store");
    let userId: string | null = null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        userId = parsed?.user?.id ?? null;
      } catch {
        userId = null;
      }
    }

    if (!userId) return;

    loadEmployeeHistorySnapshot(userId).then((res) => {
      if (!mounted) return;
      setAttendance(res.attendance ?? []);
    });

    const onRealtime = () =>
      loadEmployeeHistorySnapshot(userId).then((res) =>
        setAttendance(res.attendance ?? []),
      );
    window.addEventListener("hrms:realtime", onRealtime as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener("hrms:realtime", onRealtime as EventListener);
    };
  }, []);

  const exportAttendance = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      attendance.map((entry) => ({
        Employee: entry.employee,
        Department: entry.department,
        ClockIn: entry.clockIn,
        ClockOut: entry.clockOut,
        Hours: entry.hours,
        Status: entry.status,
      })),
    );

    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, "Attendance_History.xlsx");
    toast.success("Attendance history exported");
  };

  const averageHours =
    attendance.length > 0
      ? attendance.reduce((total, entry) => total + entry.hours, 0) /
        attendance.length
      : 0;
  const onTimeRate =
    attendance.length > 0
      ? Math.round(
          (attendance.filter((entry) => entry.status === "Present").length /
            attendance.length) *
            100,
        )
      : 0;
  const workdayCompletion = Math.round(Math.min(100, (averageHours / 8) * 100));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Attendance History
          </h1>
          <p className="text-muted-foreground mt-1">
            Review clock-ins, clock-outs, and daily performance trends.
          </p>
        </div>
        <Button onClick={exportAttendance} className="gap-2 w-fit">
          <Download className="h-4 w-4" />
          Export History
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock3 className="h-4 w-4 text-primary" />
              Average Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatWorkHours(averageHours)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Daily average for the current week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              On-time Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{onTimeRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Derived from live attendance rows
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Route className="h-4 w-4 text-primary" />
              Workday Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{workdayCompletion}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Hours completed against the configured 8-hour workday
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance Sessions</CardTitle>
          <CardDescription>
            Detailed clock activity with automatic Present / Half Day
            labels.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {attendance.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No attendance history yet.
            </p>
          ) : (
            attendance.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-border/70 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{entry.department}</p>
                      <Badge variant="outline" className="rounded-full">
                        {entry.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {entry.employee}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:min-w-90">
                    <div>
                      <p className="text-xs text-muted-foreground">Clock in</p>
                      <p className="font-medium">{entry.clockIn}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Clock out</p>
                      <p className="font-medium">{entry.clockOut}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Hours</p>
                      <p className="font-medium">
                        {entry.hours.toFixed(2)} hrs
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <Progress value={Math.min(100, (entry.hours / 8) * 100)} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
