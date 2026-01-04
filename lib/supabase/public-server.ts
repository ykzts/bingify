import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Create a public Supabase client for server-side use without authentication.
 * This client does not access cookies and can be used in SSG contexts.
 * Use this for public data that doesn't require authentication.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!(url && key)) {
    throw new Error("Missing Supabase environment variables");
  }

  return createSupabaseClient<Database>(url, key);
}
