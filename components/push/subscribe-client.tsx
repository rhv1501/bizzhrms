"use client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";

export default function PushSubscribe() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    (async () => {
      // Prefer build-time public key, fallback to server endpoint that reads VAPID_PUBLIC_KEY
      let vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        try {
          const res = await fetch('/api/push/public-key');
          const json = await res.json();
          vapidKey = json?.publicKey ?? null;
        } catch (e) {
          console.warn('Failed to fetch vapid public key', e);
        }
      }

      if (!vapidKey) return;
      if (!user?.id) return; // wait until auth hydrates and we have a user id

      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const reg = await navigator.serviceWorker.register('/sw.js');
        const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        // Prefer authenticated subscribe endpoint, but fall back to admin-backed anon endpoint
        const payload = { subscription: sub.toJSON(), userId: user?.id };
        try {
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch (e) {
          // fallback to admin-backed endpoint if cookie-based auth isn't available
          await fetch('/api/push/subscribe/anon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
      } catch (e) {
        console.warn('Push subscribe failed', e);
      }
    })();
  }, [user]);

  return null;
}
