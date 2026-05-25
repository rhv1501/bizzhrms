"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";
import { updateSettings } from "@/lib/hrms/live";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  const [settings, setSettings] = useState({
    id: "",
    office_start_time: "09:00",
    office_end_time: "18:00",
    min_work_hours: 8,
    min_intern_work_hours: 4,
    allowed_clock_in_window_minutes: 15,
    geolocation_enabled: false,
    enforce_task_completion: true,
  });

  useEffect(() => {
    async function loadSettings() {
      const supabase = createClient();
      const { data: rawData, error } = await supabase.from("settings" as any).select("*").limit(1).single();
      if (rawData) {
        const data = rawData as any;
        setSettings({
          id: data.id,
          office_start_time: data.office_start_time?.slice(0, 5) || "09:00", // '09:00:00' -> '09:00'
          office_end_time: data.office_end_time?.slice(0, 5) || "18:00",
          min_work_hours: data.min_work_hours || 8,
          min_intern_work_hours: data.min_intern_work_hours || 4,
          allowed_clock_in_window_minutes: data.allowed_clock_in_window_minutes || 15,
          geolocation_enabled: !!data.geolocation_enabled,
          enforce_task_completion: !!data.enforce_task_completion,
        });
      }
      setIsFetching(false);
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateSettings({
        office_start_time: `${settings.office_start_time}:00`,
        office_end_time: `${settings.office_end_time}:00`,
        min_work_hours: Number(settings.min_work_hours),
        min_intern_work_hours: Number(settings.min_intern_work_hours),
        allowed_clock_in_window_minutes: Number(settings.allowed_clock_in_window_minutes),
        geolocation_enabled: settings.geolocation_enabled,
        enforce_task_completion: settings.enforce_task_completion,
      } as any);
      
      toast.success("Settings saved successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground mt-1">Configure company policies and HRMS parameters.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance & Time Tracking</CardTitle>
            <CardDescription>Configure office timings and clock-in restrictions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="office_start">Office Start Time</Label>
                <Input id="office_start" type="time" value={settings.office_start_time} onChange={e => setSettings({...settings, office_start_time: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="office_end">Office End Time</Label>
                <Input id="office_end" type="time" value={settings.office_end_time} onChange={e => setSettings({...settings, office_end_time: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grace_period">Allowed Clock-In Window (minutes)</Label>
                <div className="text-xs text-muted-foreground mb-1">Time allowed before being marked Late</div>
                <Input id="grace_period" type="number" value={settings.allowed_clock_in_window_minutes} onChange={e => setSettings({...settings, allowed_clock_in_window_minutes: parseInt(e.target.value) || 0})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_hours">Full-Time Working Hours</Label>
                <div className="text-xs text-muted-foreground mb-1">Required hours before clock-out is permitted</div>
                <Input id="min_hours" type="number" step="0.5" value={settings.min_work_hours} onChange={e => setSettings({...settings, min_work_hours: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_intern_hours">Intern Working Hours</Label>
                <div className="text-xs text-muted-foreground mb-1">Required hours for interns</div>
                <Input id="min_intern_hours" type="number" step="0.5" value={settings.min_intern_work_hours} onChange={e => setSettings({...settings, min_intern_work_hours: parseFloat(e.target.value) || 0})} />
              </div>
            </div>

            <div className="flex items-center justify-between border p-4 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Enforce Tasks Completion</Label>
                <p className="text-sm text-muted-foreground">
                  Prevent employees from clocking out if they have pending daily tasks.
                </p>
              </div>
              <Switch checked={settings.enforce_task_completion} onCheckedChange={c => setSettings({...settings, enforce_task_completion: c})} />
            </div>
            
            <div className="flex items-center justify-between border p-4 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Geolocation Verification</Label>
                <p className="text-sm text-muted-foreground">
                  Require GPS location when clocking in or out.
                </p>
              </div>
              <Switch checked={settings.geolocation_enabled} onCheckedChange={c => setSettings({...settings, geolocation_enabled: c})} />
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Settings"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
