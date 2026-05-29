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

export async function GET(request: NextRequest) {
  try {
    const supabase = buildServerClient(request);

    // Try to read from a `notifications` table if present. If it doesn't exist, return empty array.
    // Determine user from session if available
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let builder = supabase.from("notifications").select("id,title,body,created_at,type,read_at,user_id").order("created_at", { ascending: false }).limit(50 as any);

    // If a user is authenticated, return notifications targeted to that user OR system notifications (user_id null)
    if (user?.id) {
      const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
      const isAdmin = userData?.role === "admin";
      
      if (isAdmin) {
        builder = builder.or(`user_id.eq.${user.id},user_id.is.null` as any);
      } else {
        builder = builder.or(`user_id.eq.${user.id},and(user_id.is.null,type.eq.system)` as any);
      }
    }

    const { data, error } = await builder;

    if (error) {
      // Table might not exist; return empty list.
      return NextResponse.json({ notifications: [] });
    }

    return NextResponse.json({ notifications: data ?? [] });
  } catch (err) {
    return NextResponse.json({ notifications: [] });
  }
}
