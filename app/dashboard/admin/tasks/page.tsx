"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  createTaskAssignment,
  loadAdminTasksSnapshot,
  editTask,
  deleteTask,
  type AdminTasksSnapshot,
} from "@/lib/hrms/live";

export default function AdminTasksPage() {
  const [snapshot, setSnapshot] = useState<AdminTasksSnapshot | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [deadline, setDeadline] = useState("");
  const [editingTask, setEditingTask] = useState<{ id: string; title: string; description: string; priority: string; deadline: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let mounted = true;

    loadAdminTasksSnapshot().then((result) => {
      if (!mounted) return;
      setSnapshot(result);
      if (!employeeId) {
        const firstEmployee = result.employees.find(
          (employee) => employee.role !== "admin",
        );
        if (firstEmployee) {
          setEmployeeId(firstEmployee.id);
        }
      }
    });

    const onRealtime = () =>
      loadAdminTasksSnapshot().then((result) => setSnapshot(result));
    window.addEventListener("hrms:realtime", onRealtime as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener("hrms:realtime", onRealtime as EventListener);
    };
  }, []);

  const employees = useMemo(
    () =>
      (snapshot?.employees ?? []).filter(
        (employee) => employee.role !== "admin",
      ),
    [snapshot],
  );

  const tasks = snapshot?.tasks ?? [];

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!employeeId) {
        throw new Error("Select an employee first");
      }

      await createTaskAssignment({
        userId: employeeId,
        title,
        description,
        priority,
        deadline: deadline || undefined,
      });

      const refreshed = await loadAdminTasksSnapshot();
      setSnapshot(refreshed);
      setTitle("");
      setDescription("");
      setPriority("Medium");
      setDeadline("");
      toast.success("Task assigned successfully");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to assign task",
      );
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    // Optimistic update
    setSnapshot(prev => prev ? { ...prev, tasks: prev.tasks.filter(t => t.id !== id) } : null);
    
    try {
      await deleteTask(id);
      toast.success("Task deleted successfully");
      const refreshed = await loadAdminTasksSnapshot();
      setSnapshot(refreshed);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete task");
      // Rollback
      const refreshed = await loadAdminTasksSnapshot();
      setSnapshot(refreshed);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setIsUpdating(true);
    try {
      await editTask(editingTask.id, {
        title: editingTask.title,
        description: editingTask.description,
        priority: editingTask.priority,
        deadline: editingTask.deadline || undefined,
      });
      toast.success("Task updated successfully");
      setEditingTask(null);
      const refreshed = await loadAdminTasksSnapshot();
      setSnapshot(refreshed);
    } catch (error: any) {
      toast.error(error.message || "Failed to update task");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Task Management</h1>
        <p className="text-muted-foreground mt-1">
          Assign and monitor daily tasks for employees.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Assign New Task</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssignTask} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employee">Assign To</Label>
                  <Select
                    required
                    value={employeeId}
                    onValueChange={(value) => setEmployeeId(value ?? "")}
                  >
                    <SelectTrigger id="employee">
                      {employeeId ? (
                        (() => {
                          const emp = employees.find(e => e.id === employeeId);
                          return emp ? `${emp.full_name ?? emp.email} (${emp.department ?? "General"})` : "Select employee";
                        })()
                      ) : (
                        <span className="text-muted-foreground">Select employee</span>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {employees.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          No employees available
                        </SelectItem>
                      ) : (
                        employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.full_name ?? employee.email} (
                            {employee.department ?? "General"})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Task Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Prepare Q3 Report"
                    required
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea
                    id="desc"
                    placeholder="Task details..."
                    className="resize-none"
                    rows={3}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={priority}
                      onValueChange={(value) =>
                        setPriority(value as "Low" | "Medium" | "High")
                      }
                    >
                      <SelectTrigger id="priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      required
                      value={deadline}
                      onChange={(event) => setDeadline(event.target.value)}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full mt-2">
                  Assign Task
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Active Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No tasks assigned yet.
                  </p>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="mb-2 sm:mb-0">
                        <p className="font-medium text-base">{task.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            Assigned to:{" "}
                            <span className="font-medium text-foreground">
                              {task.assignee}
                            </span>
                          </span>
                          <span>•</span>
                          <span>Due: {task.deadline}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            task.priority === "High"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {task.priority}
                        </Badge>
                        <Badge
                          variant={
                            task.status === "completed" ? "default" : "outline"
                          }
                          className={
                            task.status === "completed"
                              ? "bg-green-500 hover:bg-green-600"
                              : ""
                          }
                        >
                          {task.status === "completed"
                            ? "Completed"
                            : "Pending"}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8 ml-2" onClick={() => setEditingTask({ id: task.id, title: task.title, description: task.description, priority: task.priority, deadline: task.deadline === "No deadline" ? "" : task.deadline })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteTask(task.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <form onSubmit={handleUpdateTask} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Task Title</Label>
                <Input
                  id="edit-title"
                  required
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Description</Label>
                <Textarea
                  id="edit-desc"
                  className="resize-none"
                  rows={3}
                  value={editingTask.description}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select
                    value={editingTask.priority}
                    onValueChange={(value) => setEditingTask({ ...editingTask, priority: value as string })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-deadline">Deadline</Label>
                  <Input
                    id="edit-deadline"
                    type="date"
                    required
                    value={editingTask.deadline}
                    onChange={(e) => setEditingTask({ ...editingTask, deadline: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
                <Button type="submit" disabled={isUpdating}>{isUpdating ? "Saving..." : "Save Changes"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
