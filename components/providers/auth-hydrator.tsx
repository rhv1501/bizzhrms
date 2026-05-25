"use client";

import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useAuthStore } from "@/store/useAuthStore";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { Database } from "@/types/supabase";
import HrmsRealtimeMount from "./hrms-realtime-mount";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

function withTimeout<T>(promise: PromiseLike<T>, label: string, ms = 30000): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timeoutId)),
    timeoutPromise,
  ]);
}

export function AuthHydrator() {
  const setUser = useAuthStore((state) => state.setUser);
  const setIsLoading = useAuthStore((state) => state.setIsLoading);

  useEffect(() => {
    const { url, key } = getSupabaseConfig();

    if (!url || !key) {
      setUser(useAuthStore.getState().user ?? null);
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    let isMounted = true;

    const syncProfile = async () => {
      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), "Session load");

        if (!isMounted) {
          return;
        }

        if (!session?.user) {
          setUser(null);
          return;
        }

        const profileResult = (await withTimeout(
          supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle(),
          "Profile load",
        )) as { data: UserRow | null };
        const profile = profileResult.data;

        if (!isMounted) {
          return;
        }

        setUser(profile ?? null);
      } catch (error) {
        if (isMounted) {
          if (error instanceof Error && error.message.includes("timed out")) {
            console.warn("Auth hydration: Network took too long, falling back to cached profile.");
          } else {
            console.error("Auth hydration failed", error);
          }
          setUser(useAuthStore.getState().user ?? null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    syncProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) {
        return;
      }

      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const profileResult = (await withTimeout(
          supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle(),
          "Profile refresh",
        )) as { data: UserRow | null };
        const profile = profileResult.data;

        if (profile) {
          setUser(profile);
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("timed out")) {
          console.warn("Auth state refresh: Network took too long, retaining current profile.");
        } else {
          console.error("Auth state refresh failed", error);
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setIsLoading, setUser]);

  // Mount the realtime client mount after hydration so it uses browser APIs
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mountEl = document.getElementById("hrms-realtime-mount");
    if (!mountEl) return;

    const mount = document.createElement("div");
    mountEl.appendChild(mount);
    const root = createRoot(mount);
    root.render(<HrmsRealtimeMount />);

    return () => {
      root.unmount();
      mount.remove();
    };
  }, []);

  return null;
}
