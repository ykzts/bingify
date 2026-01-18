import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Get the cron secret for authenticating cron job endpoints
 *
 * Priority:
 * 1. Environment variable (CRON_SECRET) - for backwards compatibility
 * 2. Database (Supabase Vault) - new preferred method
 *
 * @returns The cron secret or null if not configured
 */
export async function getCronSecretForAuth(): Promise<string | null> {
  // First, check environment variable (highest priority for backwards compatibility)
  const envSecret = process.env.CRON_SECRET;
  if (envSecret) {
    return envSecret;
  }

  // If no environment variable, try to get from database using service role
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!(supabaseUrl && supabaseServiceKey)) {
      return null;
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase.rpc("get_cron_secret");

    if (error) {
      console.error("Error fetching cron secret from database:", error);
      return null;
    }

    // Type assertion for the RPC result
    const result = data as
      | { success: false; error: string }
      | { success: true; data: { secret: string; updated_at: string } };

    if (!result?.success) {
      // Secret not found is not an error - it just means it hasn't been set yet
      return null;
    }

    return result.data?.secret || null;
  } catch (error) {
    console.error("Error in getCronSecretForAuth:", error);
    return null;
  }
}
