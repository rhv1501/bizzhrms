"use client";

import { useEffect, useState } from "react";
import { CalendarRange, Check, X, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  loadAdminLeaveSnapshot,
  updateLeaveStatus,
  updateLeaveRequest,
  deleteLeaveRequest,
  type AdminLeaveSnapshot,
} from "@/lib/hrms/live";

export default function AdminLeavePage() {
  const [snapshot, setSnapshot] = useState<AdminLeaveSnapshot | null>(null);
  const [editingLeave, setEditingLeave] = useState<{ id: string; type: string; reason: string; start: string; end: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let mounted = true;

    loadAdminLeaveSnapshot().then((result) => {
      if (mounted) setSnapshot(result);
    });

    const onRealtime = () =>
      loadAdminLeaveSnapshot().then((result) => setSnapshot(result));
    window.addEventListener("hrms:realtime", onRealtime as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener("hrms:realtime", onRealtime as EventListener);
    };
  }, []);

  const requests = snapshot?.requests ?? [];

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      await updateLeaveStatus(id, status);
      const refreshed = await loadAdminLeaveSnapshot();
      setSnapshot(refreshed);
      toast.success(
        status === "approved" ? "Leave approved" : "Leave rejected",
      );
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update leave request",
      );
    }
  };

  const handleDeleteLeave = async (id: string) => {
    if (!confirm("Are you sure you want to delete this leave request?")) return;
    
    // Optimistic update
    setSnapshot(prev => prev ? { ...prev, requests: prev.requests.filter(r => r.id !== id) } : null);
    
    try {
      await deleteLeaveRequest(id);
      toast.success("Leave request deleted");
      const refreshed = await loadAdminLeaveSnapshot();
      setSnapshot(refreshed);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete leave request");
      // Rollback
      const refreshed = await loadAdminLeaveSnapshot();
      setSnapshot(refreshed);
    }
  };

  const handleUpdateLeave = async (e: React.FormEvent) => {
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
      toast.success("Leave updated successfully");
      setEditingLeave(null);
      const refreshed = await loadAdminLeaveSnapshot();
      setSnapshot(refreshed);
    } catch (error: any) {
      toast.error(error.message || "Failed to update leave");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Approvals</h1>
          <p className="text-muted-foreground mt-1">
            Review requests, enforce policy, and notify employees instantly.
          </p>
        </div>
        <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
          <CalendarRange className="mr-1 h-3.5 w-3.5" />
          {
            requests.filter((request) => request.status === "pending").length
          }{" "}
          pending
        </Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Policy Snapshot</CardTitle>
            <CardDescription>
              Consistent rules that keep leave approvals predictable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/70 p-4">
              <p className="text-sm font-medium">Auto notifications</p>
              <p className="text-sm text-muted-foreground">
                Approval and rejection events notify employees in real time.
              </p>
            </div>
            <div className="rounded-xl border border-border/70 p-4">
              <p className="text-sm font-medium">Document support</p>
              <p className="text-sm text-muted-foreground">
                Attach medical notes or supporting files from Supabase Storage.
              </p>
            </div>
            <div className="rounded-xl border border-border/70 p-4">
              <p className="text-sm font-medium">Audit trail</p>
              <p className="text-sm text-muted-foreground">
                Every admin decision is recorded for compliance and reporting.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave Queue</CardTitle>
            <CardDescription>
              Pending and resolved requests in one view.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No leave requests yet.
              </p>
            ) : (
              requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-xl border border-border/70 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{request.employee}</p>
                        <Badge
                          variant={
                            request.status === "pending"
                              ? "secondary"
                              : request.status === "approved"
                                ? "default"
                                : "destructive"
                          }
                          className="rounded-full capitalize"
                        >
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {request.type} • {request.range}
                      </p>
                      <p className="mt-2 text-sm text-foreground/80">
                        {request.reason}
                      </p>
                    </div>

                    {request.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="gap-2"
                          onClick={() => updateStatus(request.id, "approved")}
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => updateStatus(request.id, "rejected")}
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    ) : null}
                    {request.status !== "approved" && (
                      <div className="flex gap-2 mt-3 lg:mt-0 lg:ml-3">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingLeave({
                            id: request.id,
                            type: request.type,
                            reason: request.reason || "",
                            start: request.range.split(" - ")[0] || "",
                            end: request.range.split(" - ")[1] || request.range.split(" - ")[0] || ""
                          })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteLeave(request.id)}
                        >
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

      <Dialog open={!!editingLeave} onOpenChange={(open) => !open && setEditingLeave(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Leave Request</DialogTitle>
          </DialogHeader>
          {editingLeave && (
            <form onSubmit={handleUpdateLeave} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-type">Leave Type</Label>
                <Select
                  value={editingLeave.type}
                  onValueChange={(value) => setEditingLeave({ ...editingLeave, type: value as string })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Textarea
                  id="edit-reason"
                  className="resize-none"
                  rows={3}
                  value={editingLeave.reason}
                  onChange={(e) => setEditingLeave({ ...editingLeave, reason: e.target.value })}
                />
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
