import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Creates a Supabase client with service role privileges.
 * This client bypasses Row Level Security (RLS) and should only be used
 * for admin operations on the server side.
 *
 * During build time, environment variables may not be available.
 * The client creation is deferred to actual usage to allow builds to succeed.
 *
 * @returns Supabase client with service role access
 * @throws Error if required environment variables are missing at runtime
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!(url && serviceRoleKey)) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
