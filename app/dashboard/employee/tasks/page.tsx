"use client";

import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle2, ClipboardList, Hourglass } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { loadEmployeeTasksSnapshot, createTaskAssignment, updateTaskStatus } from "@/lib/hrms/live";
import { createClient } from "@/lib/supabase/client";
import { type TaskItem } from "@/lib/hrms/mock";
import { useAuthStore } from "@/store/useAuthStore";

export default function EmployeeTasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "Medium",
    deadline: "",
    assigneeId: "",
  });
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!user) return;
    setCurrentUser(user.id);

    const supabase = createClient();
    supabase.from("users").select("id, full_name, email, department").then(({ data }) => {
      if (data && mounted) setUsers(data);
    });

    loadEmployeeTasksSnapshot(user.id).then((res) => {
      if (!mounted) return;
      setTasks(res.tasks ?? []);
    });

    const onRealtime = () =>
      loadEmployeeTasksSnapshot(user.id).then((res) =>
        setTasks(res.tasks ?? []),
      );
    window.addEventListener("hrms:realtime", onRealtime as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener("hrms:realtime", onRealtime as EventListener);
    };
  }, [user]);

  const taskProgress = useMemo(() => {
    const total = tasks.length || 1;
    const completed = tasks.filter(
      (task) => task.status === "completed",
    ).length;
    return Math.round((completed / total) * 100);
  }, [tasks]);

  const completeTask = async (id: string) => {
    try {
      await updateTaskStatus(id, "completed");
      setTasks((current) =>
        current.map((task) =>
          task.id === id ? { ...task, status: "completed", progress: 100 } : task,
        ),
      );
      toast.success("Task marked complete");
    } catch (e: any) {
      toast.error(e.message || "Failed to mark complete");
    }
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.assigneeId) return;

    setIsAssigning(true);
    try {
      await createTaskAssignment({
        userId: newTask.assigneeId,
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority as any,
        deadline: newTask.deadline || undefined,
      });

      toast.success("Task assigned successfully");
      setNewTask({ title: "", description: "", priority: "Medium", deadline: "", assigneeId: "" });
      
      // close dialog by resetting state and if it is assigned to self, reload
      if (newTask.assigneeId === currentUser) {
        const res = await loadEmployeeTasksSnapshot(currentUser);
        setTasks(res.tasks ?? []);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to assign task");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Track progress against today’s assignments before clocking out.
          </p>
        </div>
        <div className="flex flex-col gap-4 items-end">
          <Dialog>
            <DialogTrigger className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background h-10 py-2 px-4">
              Assign Task
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Task to Employee or Admin</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAssignTask} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select required value={newTask.assigneeId} onValueChange={(v) => setNewTask({...newTask, assigneeId: v ?? ""})}>
                    <SelectTrigger>
                      {newTask.assigneeId ? (
                        (() => {
                          const emp = users.find(u => u.id === newTask.assigneeId);
                          return emp ? `${emp.full_name || emp.email} (${emp.department || "General"})` : "Select a user";
                        })()
                      ) : (
                        <span className="text-muted-foreground">Select a user</span>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name || u.email} ({u.department || "General"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Task Title</Label>
                  <Input required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={newTask.priority} onValueChange={(v) => setNewTask({...newTask, priority: v ?? "Medium"})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Deadline</Label>
                    <Input type="date" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} />
                  </div>
                </div>
                <Button type="submit" disabled={isAssigning} className="w-full">
                  {isAssigning ? "Assigning..." : "Assign Task"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <div className="w-full max-w-xs">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Completion</span>
            <span className="font-medium">{taskProgress}%</span>
          </div>
          <Progress value={taskProgress} />
        </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ClipboardList className="h-4 w-4 text-primary" />
              Open Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {tasks.filter((task) => task.status !== "completed").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Needs attention before end of day
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {tasks.filter((task) => task.status === "completed").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tasks ready for clock-out validation
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Hourglass className="h-4 w-4 text-primary" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {tasks.filter((task) => task.status === "in_progress").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Actively being worked on
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Board</CardTitle>
          <CardDescription>
            Task progress tracking feeds clock-out enforcement and productivity
            analytics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border border-border/70 p-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{task.title}</h3>
                    <Badge
                      variant={
                        task.priority === "High"
                          ? "destructive"
                          : task.priority === "Medium"
                            ? "secondary"
                            : "outline"
                      }
                      className="rounded-full"
                    >
                      {task.priority}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full capitalize"
                    >
                      {task.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {task.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Assigned by admin • Due {task.deadline}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-40">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} />
                  </div>
                  {task.status !== "completed" ? (
                    <Button size="sm" onClick={() => completeTask(task.id)}>
                      Complete
                    </Button>
                  ) : (
                    <Badge variant="default" className="rounded-full">
                      Ready
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
