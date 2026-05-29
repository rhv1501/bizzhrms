"use client";

import * as XLSX from "xlsx";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  loadAdminEmployeesSnapshot,
  type AdminEmployeesSnapshot,
} from "@/lib/hrms/live";
import { Download, ShieldCheck, TimerReset, Users, Pencil, Trash2 } from "lucide-react";

export default function AdminEmployeesPage() {
  const [snapshot, setSnapshot] = useState<AdminEmployeesSnapshot | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    department: "General",
    role: "employee" as "employee" | "admin",
    employee_type: "full-time" as "full-time" | "intern",
  });
  const [editingEmployee, setEditingEmployee] = useState<{ id: string; full_name: string; department: string; role: string; employee_type: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let mounted = true;

    loadAdminEmployeesSnapshot().then((result) => {
      if (mounted) setSnapshot(result);
    });

    const onRealtime = () =>
      loadAdminEmployeesSnapshot().then((result) => setSnapshot(result));
    window.addEventListener("hrms:realtime", onRealtime as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener("hrms:realtime", onRealtime as EventListener);
    };
  }, []);

  const exportEmployees = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      (snapshot?.employees ?? []).map((employee) => ({
        Name: employee.name,
        Email: employee.email,
        Role: employee.role,
        Department: employee.department,
        Title: employee.title,
        Attendance: employee.attendance,
        Hours: employee.hours,
        LeaveBalance: employee.leaveBalance,
      })),
    );

    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, "Employee_Overview.xlsx");
    toast.success("Employee report exported");
  };

  const createEmployee = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setIsCreating(true);

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to create user");
      }

      const refreshed = await loadAdminEmployeesSnapshot();
      setSnapshot(refreshed);
      setNewUser({
        email: "",
        password: "",
        full_name: "",
        department: "General",
        role: "employee",
        employee_type: "full-time",
      });
      toast.success("User created successfully");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create user");
    } finally {
      setIsCreating(false);
    }
  };

  const deleteEmployee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    
    // Optimistic update
    setSnapshot(prev => prev ? { ...prev, employees: prev.employees.filter(e => e.id !== id) } : null);
    
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      toast.success("Employee deleted successfully");
      const refreshed = await loadAdminEmployeesSnapshot();
      setSnapshot(refreshed);
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
      // Rollback on failure
      const refreshed = await loadAdminEmployeesSnapshot();
      setSnapshot(refreshed);
    }
  };

  const updateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${editingEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: editingEmployee.full_name,
          department: editingEmployee.department,
          role: editingEmployee.role,
          employee_type: editingEmployee.employee_type,
        }),
      });
      if (!res.ok) throw new Error("Failed to update user");
      toast.success("Employee updated successfully");
      setEditingEmployee(null);
      const refreshed = await loadAdminEmployeesSnapshot();
      setSnapshot(refreshed);
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Employee Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Track people, roles, attendance health, and department load.
          </p>
        </div>
        <Button className="gap-2 w-fit" onClick={exportEmployees}>
          <Download className="h-4 w-4" />
          Export Employee Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provision New User</CardTitle>
          <CardDescription>
            Create employee or admin accounts from the HRMS admin console.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createEmployee} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                required
                value={newUser.email}
                onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                type="password"
                required
                value={newUser.password}
                onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name">Full Name</Label>
              <Input
                id="create-name"
                value={newUser.full_name}
                onChange={(event) => setNewUser((current) => ({ ...current, full_name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-department">Department</Label>
              <Input
                id="create-department"
                value={newUser.department}
                onChange={(event) => setNewUser((current) => ({ ...current, department: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) =>
                  setNewUser((current) => ({
                    ...current,
                    role: value === "admin" ? "admin" : "employee",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Employee Type</Label>
              <Select
                value={newUser.employee_type}
                onValueChange={(value) =>
                  setNewUser((current) => ({
                    ...current,
                    employee_type: value as "full-time" | "intern",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full Time</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 xl:col-span-5 flex justify-end">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {snapshot?.employees.length ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Real employees in the database
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TimerReset className="h-4 w-4 text-primary" />
              Attendance Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {snapshot?.attendance.length
                ? Math.round(
                    (snapshot.attendance.filter(
                      (item) => item.status === "Present",
                    ).length /
                      snapshot.attendance.length) *
                      100,
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Derived from live attendance rows
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Policy Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">100%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Admin policy status
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Employee Directory</CardTitle>
            <CardDescription>
              Current people roster with attendance and productivity snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(snapshot?.employees ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No employees found yet.
              </p>
            ) : (
              (snapshot?.employees ?? []).map((employee) => (
                <div
                  key={employee.id}
                  className="rounded-xl border border-border/70 p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary font-semibold">
                        {employee.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium">{employee.name}</h3>
                          <Badge
                            variant={
                              employee.role === "admin" ? "default" : "outline"
                            }
                            className="rounded-full capitalize"
                          >
                            {employee.role}
                          </Badge>
                          <Badge variant="secondary" className="rounded-full">
                            {employee.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {employee.title} • {employee.department}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {employee.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 lg:mt-0">
                      <Button variant="ghost" size="icon" onClick={() => setEditingEmployee({ id: employee.id, full_name: employee.name, department: employee.department, role: employee.role, employee_type: employee.employeeType })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteEmployee(employee.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:min-w-90 bg-muted/20 p-3 rounded-lg border border-border/50">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Clock in
                      </p>
                      <p className="font-medium">{employee.clockIn}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Hours</p>
                      <p className="font-medium">
                        {employee.hours.toFixed(2)} hrs
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Leave balance
                      </p>
                      <p className="font-medium">
                        {employee.leaveBalance} days
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Task completion</span>
                        <span>{employee.taskCompletion}%</span>
                      </div>
                      <Progress value={employee.taskCompletion} />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Attendance status</span>
                        <span>{employee.attendance}</span>
                      </div>
                      <Badge variant="outline" className="w-fit rounded-full">
                        Live: {employee.attendance}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Department Mix</CardTitle>
              <CardDescription>
                Quick snapshot of workforce distribution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(snapshot?.departments ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No department data yet.
                </p>
              ) : (
                (snapshot?.departments ?? []).map((department) => (
                  <div key={department.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{department.name}</span>
                      <span className="text-muted-foreground">
                        {department.employees} employees
                      </span>
                    </div>
                    <Progress value={department.occupancy} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Latest Attendance Events</CardTitle>
              <CardDescription>
                Recent clock-ins and clock-outs across the organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(snapshot?.attendance ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No attendance events yet.
                </p>
              ) : (
                (snapshot?.attendance ?? []).slice(0, 4).map((attendance) => (
                  <div
                    key={attendance.id}
                    className="rounded-xl border border-border/70 p-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{attendance.employee}</p>
                        <p className="text-xs text-muted-foreground">
                          {attendance.department}
                        </p>
                      </div>
                      <Badge variant="outline">{attendance.status}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {attendance.clockIn} to {attendance.clockOut} •{" "}
                      {attendance.hours.toFixed(2)} hours
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          {editingEmployee && (
            <form onSubmit={updateEmployee} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editingEmployee.full_name}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-department">Department</Label>
                <Input
                  id="edit-department"
                  value={editingEmployee.department}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={editingEmployee.role}
                  onValueChange={(value) => setEditingEmployee({ ...editingEmployee, role: value as string })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employee Type</Label>
                <Select
                  value={editingEmployee.employee_type}
                  onValueChange={(value) => setEditingEmployee({ ...editingEmployee, employee_type: value as string })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full Time</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingEmployee(null)}>Cancel</Button>
                <Button type="submit" disabled={isUpdating}>{isUpdating ? "Saving..." : "Save Changes"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
