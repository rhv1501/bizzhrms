import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./env";
import { Database } from "@/types/supabase";

export function createClient() {
  const { url, key } = getSupabaseConfig();

  if (!url || !key) {
    throw new Error("Supabase client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createBrowserClient<Database>(
    url,
    key
  );
}
