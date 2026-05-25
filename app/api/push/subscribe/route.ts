import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { Database } from "@/types/supabase";

function buildServerClient(request: NextRequest) {
  const { url, key } = getSupabaseConfig();

  if (!url || !key) {
    throw new Error("Supabase configuration is missing");
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // No-op for route usage
      },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      subscription: {
        endpoint: string;
        keys: Record<string, string>;
      };
    };

    if (!body?.subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    const supabase = buildServerClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = {
      user_id: user.id,
      endpoint: body.subscription.endpoint,
      keys: body.subscription.keys,
    } as never;

    const { data: existing } = await supabase.from("push_subscriptions" as any).select("id").eq("endpoint", body.subscription.endpoint).maybeSingle();
    
    let error;
    if (existing) {
      const { error: updateError } = await supabase.from("push_subscriptions" as any).update(payload).eq("id", (existing as any).id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("push_subscriptions" as any).insert(payload);
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
