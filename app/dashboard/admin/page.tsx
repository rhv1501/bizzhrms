"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Clock, Calendar, CheckSquare, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useEffect, useState } from "react";
import {
  loadAdminDashboardSnapshot,
  loadAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  updateLeaveStatus,
  type AdminDashboardSnapshot,
  type AnnouncementItem,
} from "@/lib/hrms/live";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, BadgeAlert, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
  const [snapshot, setSnapshot] = useState<AdminDashboardSnapshot | null>(null);

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "", type: "general" });
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      loadAdminDashboardSnapshot(),
      loadAnnouncements()
    ]).then(([s, a]) => {
      if (mounted) {
        setSnapshot(s);
        setAnnouncements(a);
      }
    });

    const onRealtime = () => {
      loadAdminDashboardSnapshot().then((s) => { if (mounted) setSnapshot(s); });
      loadAnnouncements().then((a) => { if (mounted) setAnnouncements(a); });
    };
    window.addEventListener("hrms:realtime", onRealtime as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener("hrms:realtime", onRealtime as EventListener);
    };
  }, []);

  const handleExport = () => {
    // Generate dummy data for Excel export
    const attendanceData = (snapshot?.attendance ?? []).map((a) => ({
      Employee: a.employee,
      Status: a.status,
      ClockIn: a.clockIn,
      ClockOut: a.clockOut,
      Hours: a.hours,
    }));

    const ws = XLSX.utils.json_to_sheet(attendanceData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    XLSX.writeFile(wb, "Attendance_Report.xlsx");
    toast.success("Report downloaded successfully");
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPosting(true);
    try {
      await createAnnouncement(newAnnouncement);
      toast.success("Announcement posted successfully!");
      setNewAnnouncement({ title: "", content: "", type: "general" });
    } catch (error: any) {
      toast.error(error.message || "Failed to post announcement");
    } finally {
      setIsPosting(false);
    }
  };

  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement) return;
    setIsPosting(true);
    try {
      await updateAnnouncement(editingAnnouncement.id, {
        title: editingAnnouncement.title,
        content: editingAnnouncement.content,
        type: editingAnnouncement.type,
      });
      toast.success("Announcement updated successfully!");
      setEditingAnnouncement(null);
      loadAnnouncements().then(setAnnouncements);
    } catch (error: any) {
      toast.error(error.message || "Failed to update announcement");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    setIsDeleting(id);
    try {
      await deleteAnnouncement(id);
      toast.success("Announcement deleted");
      loadAnnouncements().then(setAnnouncements);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleUpdateLeaveStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      await updateLeaveStatus(id, status);
      toast.success(`Leave ${status}`);
      const s = await loadAdminDashboardSnapshot();
      setSnapshot(s);
    } catch (error: any) {
      toast.error(error.message || `Failed to ${status} leave`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of company workforce and operations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Dialog>
            <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 gap-2">
              <Megaphone className="w-4 h-4" />
              Post Announcement
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Announcement</DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePostAnnouncement} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newAnnouncement.type} onValueChange={v => setNewAnnouncement({...newAnnouncement, type: v ?? "general"})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="update">System Update</SelectItem>
                      <SelectItem value="win">Team Win</SelectItem>
                      <SelectItem value="holiday">Holiday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input required value={newAnnouncement.title} onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea required value={newAnnouncement.content} onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})} />
                </div>
                <Button type="submit" className="w-full" disabled={isPosting}>
                  {isPosting ? "Posting..." : "Post to Notice Board"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Button onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Export Reports
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {snapshot?.totalEmployees ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total active workforce
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {snapshot?.presentToday ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Currently clocked in</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Leaves
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {snapshot?.pendingLeaves ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting your approval
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Task Completion
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {snapshot?.avgTaskCompletion ?? 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Across all assigned work
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Live Attendance</CardTitle>
            <CardDescription>
              Real-time employee status for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(snapshot?.attendance ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No attendance rows yet.
                </p>
              ) : (
                (snapshot?.attendance ?? []).map((emp) => (
                  <div
                    key={emp.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-3"
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {emp.employee
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{emp.employee}</p>
                        <p className="text-xs text-muted-foreground">
                          Clock in: {emp.clockIn}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`px-2 py-1 rounded-full text-xs font-medium 
                    ${
                      emp.status === "Present"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : emp.status === "Half Day"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                    >
                      {emp.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Leave Requests</CardTitle>
            <CardDescription>
              Action required on employee leaves
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(snapshot?.leaveRequests ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No leave requests yet.
                </p>
              ) : (
                (snapshot?.leaveRequests ?? []).map((leave) => (
                  <div
                    key={leave.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-3"
                  >
                    <div className="w-full sm:w-auto">
                      <p className="text-sm font-medium">{leave.employee}</p>
                      <p className="text-xs text-muted-foreground">
                        {leave.type} • {leave.range}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleUpdateLeaveStatus(leave.id, "approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleUpdateLeaveStatus(leave.id, "rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              Company Notice Board
            </CardTitle>
            <CardDescription>Recent announcements broadcasted to all employees</CardDescription>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No announcements posted yet.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {announcements.slice(0, 6).map(ann => (
                  <div key={ann.id} className="border rounded-lg p-4 bg-muted/10 relative group">
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditingAnnouncement(ann)}>
                        <Edit className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-destructive/10" onClick={() => handleDeleteAnnouncement(ann.id)} disabled={isDeleting === ann.id}>
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mb-2 pr-16">
                      <Badge variant={ann.type === "win" ? "default" : ann.type === "holiday" ? "destructive" : "secondary"}>
                        {ann.type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(ann.createdAt), "MMM d")}</span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{ann.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">{ann.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingAnnouncement} onOpenChange={(open) => !open && setEditingAnnouncement(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
          </DialogHeader>
          {editingAnnouncement && (
            <form onSubmit={handleUpdateAnnouncement} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editingAnnouncement.type} onValueChange={v => setEditingAnnouncement({...editingAnnouncement, type: v ?? "general"})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="update">System Update</SelectItem>
                    <SelectItem value="win">Team Win</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input required value={editingAnnouncement.title} onChange={e => setEditingAnnouncement({...editingAnnouncement, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea required value={editingAnnouncement.content} onChange={e => setEditingAnnouncement({...editingAnnouncement, content: e.target.value})} />
              </div>
              <Button type="submit" className="w-full" disabled={isPosting}>
                {isPosting ? "Updating..." : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
