"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  loadEmployeeLeavesSnapshot,
  createLeaveRequest,
  deleteLeaveRequest,
  updateLeaveRequest,
  type EmployeeLeavesSnapshot,
} from "@/lib/hrms/live";

export default function LeavePage() {
  const [snapshot, setSnapshot] = useState<EmployeeLeavesSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [editingLeave, setEditingLeave] = useState<{ id: string; type: string; reason: string; start: string; end: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [form, setForm] = useState({
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
  });

  useEffect(() => {
    let mounted = true;
    const stored = localStorage.getItem("hrms-auth-store");
    let uid: string | null = null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        uid = parsed?.state?.user?.id ?? parsed?.user?.id ?? null;
      } catch {
        uid = null;
      }
    }
    
    // In zustand persist, it's usually `parsed.state.user.id` but the tasks page used `parsed?.user?.id` - wait, the auth store is probably `{ state: { user: ... } }`. Let's just try both.
    // Actually the tasks page had `parsed?.user?.id ?? null`. I'll use both to be safe.
    if (uid) setUserId(uid);

    if (uid) {
      loadEmployeeLeavesSnapshot(uid).then((res) => {
        if (mounted) setSnapshot(res);
      });
      const onRealtime = () =>
        loadEmployeeLeavesSnapshot(uid).then((res) => {
          if (mounted) setSnapshot(res);
        });
      window.addEventListener("hrms:realtime", onRealtime as EventListener);
      return () => {
        mounted = false;
        window.removeEventListener("hrms:realtime", onRealtime as EventListener);
      };
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return toast.error("User not identified");
    if (!form.leave_type) return toast.error("Select leave type");
    setIsLoading(true);
    try {
      await createLeaveRequest({
        userId,
        leaveType: form.leave_type,
        reason: form.reason || undefined,
        startDate: form.start_date,
        endDate: form.end_date,
      });
      toast.success("Leave request submitted successfully.");
      setForm({ leave_type: "", start_date: "", end_date: "", reason: "" });
      const refreshed = await loadEmployeeLeavesSnapshot(userId);
      setSnapshot(refreshed);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this leave request?")) return;
    try {
      await deleteLeaveRequest(id);
      toast.success("Leave request deleted.");
      if (userId) {
        const refreshed = await loadEmployeeLeavesSnapshot(userId);
        setSnapshot(refreshed);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeave) return;
    setIsUpdating(true);
    try {
      await updateLeaveRequest(editingLeave.id, {
        leaveType: editingLeave.type,
        reason: editingLeave.reason,
        startDate: editingLeave.start,
        endDate: editingLeave.end,
      });
      toast.success("Leave request updated.");
      setEditingLeave(null);
      if (userId) {
        const refreshed = await loadEmployeeLeavesSnapshot(userId);
        setSnapshot(refreshed);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setIsUpdating(false);
    }
  };

  const requests = snapshot?.requests ?? [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Apply for Leave</h1>
        <p className="text-muted-foreground mt-1">Submit your time off request for manager approval.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Leave Application Form</CardTitle>
              <CardDescription>Fill in the details for your time off request.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="leave_type">Leave Type</Label>
                  <Select required value={form.leave_type} onValueChange={(v) => setForm({ ...form, leave_type: v as string })}>
                    <SelectTrigger id="leave_type">
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="casual">Casual Leave</SelectItem>
                      <SelectItem value="earned">Earned/Privilege Leave</SelectItem>
                      <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input id="start_date" type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input id="end_date" type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea id="reason" placeholder="Brief explanation for your leave..." rows={4} className="resize-none" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || !userId}>
                  {isLoading ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Leave Requests</CardTitle>
              <CardDescription>History of your recent leave requests.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leave requests found.</p>
              ) : (
                requests.map((req) => (
                  <div key={req.id} className="rounded-xl border border-border/70 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium capitalize">{req.type} Leave</p>
                          <Badge variant={req.status === "pending" ? "secondary" : req.status === "approved" ? "default" : "destructive"} className="rounded-full capitalize">
                            {req.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{req.range}</p>
                        {req.reason && <p className="mt-2 text-sm text-foreground/80">{req.reason}</p>}
                      </div>
                      
                      {req.status !== "approved" && (
                        <div className="flex gap-2">
                          <Button size="icon" variant="ghost" onClick={() => setEditingLeave({ id: req.id, type: req.type, reason: req.reason || "", start: req.range.split(" - ")[0] || "", end: req.range.split(" - ")[1] || req.range.split(" - ")[0] || "" })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(req.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Leave Balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm font-medium">Sick Leave</span>
                <span className="font-bold">4 days</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm font-medium">Casual Leave</span>
                <span className="font-bold">8 days</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm font-medium">Earned Leave</span>
                <span className="font-bold">12 days</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground pt-2">
                <span className="text-xs">Total Available</span>
                <span className="text-sm font-bold text-primary">24 days</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!editingLeave} onOpenChange={(open) => !open && setEditingLeave(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Leave Request</DialogTitle>
          </DialogHeader>
          {editingLeave && (
            <form onSubmit={handleUpdate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-type">Leave Type</Label>
                <Select value={editingLeave.type} onValueChange={(value) => setEditingLeave({ ...editingLeave, type: value as string })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="earned">Earned/Privilege Leave</SelectItem>
                    <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reason">Reason</Label>
                <Textarea id="edit-reason" className="resize-none" rows={3} value={editingLeave.reason} onChange={(e) => setEditingLeave({ ...editingLeave, reason: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingLeave(null)}>Cancel</Button>
                <Button type="submit" disabled={isUpdating}>{isUpdating ? "Saving..." : "Save Changes"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
