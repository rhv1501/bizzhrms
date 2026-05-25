"use client";

import { HrmsRealtimeProvider } from "./hrms-realtime-provider";
import PushSubscribe from "@/components/push/subscribe-client";

export default function HrmsRealtimeMount() {
  return (
    <HrmsRealtimeProvider>
      {/* Mount push subscribe so browsers register service worker and subscription */}
      <PushSubscribe />
      {/* no-op: provider only attaches listeners and re-emits events */}
      <div />
    </HrmsRealtimeProvider>
  );
}
