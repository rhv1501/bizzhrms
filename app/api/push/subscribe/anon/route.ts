import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      subscription?: { endpoint: string; keys: Record<string, string> };
    };

    if (!body?.subscription?.endpoint || !body?.userId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const admin = createAdminClient();
    const payload = {
      user_id: body.userId,
      endpoint: body.subscription.endpoint,
      keys: body.subscription.keys,
    } as never;

    const { data: existing } = await admin.from("push_subscriptions" as any).select("id").eq("endpoint", body.subscription.endpoint).maybeSingle();
    
    let error;
    if (existing) {
      const { error: updateError } = await admin.from("push_subscriptions" as any).update(payload).eq("id", (existing as any).id);
      error = updateError;
    } else {
      const { error: insertError } = await admin.from("push_subscriptions" as any).insert(payload);
      error = insertError;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
