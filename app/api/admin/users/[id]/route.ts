import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
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
        // Route handlers do not need to set cookies for this action.
      },
    },
  });
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const body = (await request.json()) as {
      role?: "admin" | "employee";
      full_name?: string;
      department?: string;
      employee_type?: "full-time" | "intern";
    };

    const supabase = buildServerClient(request);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actorProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const actorRole = (actorProfile as { role?: string } | null)?.role ?? null;
    if (actorRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .update({
        ...(body.role ? { role: body.role } : {}),
        ...(body.employee_type ? { employee_type: body.employee_type } : {}),
        ...(body.full_name ? { full_name: body.full_name.trim() } : {}),
        ...(body.department ? { department: body.department.trim() } : {}),
      } as never)
      .eq("id", params.id)
      .select("*")
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ user: profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const supabase = buildServerClient(request);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actorProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const actorRole = (actorProfile as { role?: string } | null)?.role ?? null;
    if (actorRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminClient = createAdminClient();
    
    // Explicitly delete from public.users to ensure UI removes it immediately
    const { error: publicDeleteError } = await supabase.from("users").delete().eq("id", params.id);
    if (publicDeleteError) {
      console.error("Failed to delete public.users row:", publicDeleteError);
    }

    const { error } = await adminClient.auth.admin.deleteUser(params.id);

    if (error) {
      // If the user is already deleted from auth.users, that's fine, we still deleted them from public.users
      if (error.message.toLowerCase().includes("user not found") || error.status === 404) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
