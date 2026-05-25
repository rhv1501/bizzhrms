import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseConfig } from "./lib/supabase/env";

function routeForRole(role: string | null | undefined) {
  return role === "admin" ? "/dashboard/admin" : "/dashboard/employee";
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!hasSupabaseConfig()) {
    // Supabase env not configured — skip server-side auth checks and allow
    // pages to use mock fallbacks. Avoid creating the Supabase client which
    // would throw when env vars are absent.
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRole: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    userRole = profile?.role ?? null;
  }

  // Redirect users without a session trying to access protected routes
  if (
    !user &&
    request.nextUrl.pathname.startsWith("/dashboard")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect logged in users away from login page
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = routeForRole(userRole);
    return NextResponse.redirect(url);
  }

  if (userRole === "employee" && request.nextUrl.pathname.startsWith("/dashboard/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/employee";
    return NextResponse.redirect(url);
  }

  if (userRole === "admin" && request.nextUrl.pathname.startsWith("/dashboard/employee")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/admin";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
