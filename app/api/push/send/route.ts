import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { userId?: string; title?: string; message?: string; url?: string };

    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPrivate || !vapidPublic) {
      return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
    }

    webpush.setVapidDetails("mailto:admin@hrms.local", vapidPublic, vapidPrivate);

    const admin = createAdminClient();

    if (!body.userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const { data: subs, error } = await admin.from("push_subscriptions").select("*").eq("user_id", body.userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const payload = JSON.stringify({ title: body.title || "HRMS", body: body.message || "You have a new notification", url: body.url || "/" });

    const results = await Promise.allSettled((subs || []).map((s: any) => webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload)));

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
