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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      role?: "admin" | "employee";
      full_name?: string;
      department?: string;
      employee_type?: "full-time" | "intern";
    };

    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const supabase = buildServerClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
    const { data: created, error } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.full_name ?? "",
        department: body.department ?? "General",
      },
    });

    if (error || !created.user) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to create user" },
        { status: 500 },
      );
    }

    const role = body.role ?? "employee";
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .update({
        role,
        employee_type: body.employee_type ?? "full-time",
        full_name: body.full_name?.trim() || body.email.split("@")[0],
        department: body.department?.trim() || "General",
      } as never)
      .eq("id", created.user.id)
      .select("*")
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      user: profile ?? {
        id: created.user.id,
        email: body.email,
        role,
        full_name: body.full_name ?? null,
        department: body.department ?? null,
        created_at: created.user.created_at ?? new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
