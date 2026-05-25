"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useAuthStore } from "@/store/useAuthStore";
import { Database } from "@/types/supabase";
import { getSupabaseConfig } from "@/lib/supabase/env";

const TABLES: Array<keyof Database["public"]["Tables"]> = [
  "users",
  "attendance",
  "tasks",
  "leaves",
  "settings",
  "announcements",
];

function notifyRealtimeChange(table: string, event: string, payload: any) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }

  let title = "BizzGrow HRMS";
  let body = "HRMS system updated";

  if (table === "tasks") {
    if (event === "INSERT") {
      body = "A new task has been assigned.";
    } else if (event === "UPDATE") {
      if (payload.new?.status === "completed") {
        body = "A task was marked as completed.";
      } else {
        body = "A task was updated.";
      }
    } else if (event === "DELETE") {
      body = "A task was deleted.";
    }
  } else if (table === "leaves") {
    if (event === "INSERT") {
      body = "A new leave request was submitted.";
    } else if (event === "UPDATE") {
      if (payload.new?.status === "approved") {
        body = "A leave request was approved.";
      } else if (payload.new?.status === "rejected") {
        body = "A leave request was rejected.";
      } else {
        body = "A leave request was updated.";
      }
    }
  } else if (table === "attendance") {
    if (event === "INSERT") {
      body = "A new clock-in was registered.";
    } else if (event === "UPDATE" && payload.new?.clock_out_time) {
      body = "A clock-out was registered.";
    } else {
      body = "Attendance record updated.";
    }
  } else if (table === "users") {
    body = event === "INSERT" ? "A new employee joined." : "Employee profile updated.";
  } else if (table === "settings") {
    body = "Company policies or settings were updated.";
  } else if (table === "announcements") {
    body = event === "INSERT" ? "A new announcement was posted on the Notice Board." : "An announcement was updated.";
  }

  new Notification(title, {
    body,
    vibrate: [200, 100, 200],
    silent: false,
    requireInteraction: false,
  } as any);

  // Play a soft "ding" sound to guarantee audio feedback
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) {
    // Ignore audio errors (e.g. if browser blocks autoplay before user interaction)
  }
}

export function HrmsRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const { url, key } = getSupabaseConfig();

    if (!url || !key || !user) {
      return;
    }

    const supabase = createBrowserClient<Database>(url, key);
    const channels = TABLES.map((table) =>
      supabase
        .channel(`hrms-${table}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          (payload) => {
            notifyRealtimeChange(table, payload.eventType, payload);
            window.dispatchEvent(
              new CustomEvent("hrms:realtime", {
                detail: {
                  table,
                  event: payload.eventType,
                },
              }),
            );
          },
        )
        .subscribe(),
    );

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [user]);

  return children;
}
