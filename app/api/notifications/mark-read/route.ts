import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/env";
import type { Database } from "@/types/supabase";

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
        // no-op
      },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { notificationId?: string };

    if (!body.notificationId) {
      return NextResponse.json({ error: "notificationId is required" }, { status: 400 });
    }

    const supabase = buildServerClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() } as never)
      .eq("id", body.notificationId)
      .or(`user_id.eq.${user.id},user_id.is.null` as any);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
