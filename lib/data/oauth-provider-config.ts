import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * OAuth provider configuration result
 */
export interface OAuthProviderConfig {
  client_id: string | null;
  client_secret: string | null;
  is_enabled: boolean;
  label: string | null;
  provider: string;
}

/**
 * Result type for OAuth provider config operations
 */
export interface OAuthProviderConfigResult {
  data?: OAuthProviderConfig;
  error?: string;
  success: boolean;
}

/**
 * Get OAuth provider configuration from database with Vault decryption
 * Falls back to environment variables if database config is not set
 *
 * @param supabase - Supabase client (must have admin privileges)
 * @param provider - OAuth provider name (e.g., "google", "twitch")
 * @returns OAuth provider configuration
 */
export async function getOAuthProviderConfig(
  supabase: SupabaseClient<Database>,
  provider: string
): Promise<OAuthProviderConfigResult> {
  try {
    const { data, error } = await supabase.rpc("get_oauth_provider_config", {
      p_provider: provider,
    });

    if (error) {
      console.error("Error fetching OAuth provider config:", error);
      return {
        error: error.message,
        success: false,
      };
    }

    if (!data || typeof data !== "object") {
      return {
        error: "Invalid response from server",
        success: false,
      };
    }

    const result = data as unknown as {
      data?: OAuthProviderConfig;
      success: boolean;
    };

    if (!result.success || !result.data) {
      return {
        error: "Failed to get OAuth provider configuration",
        success: false,
      };
    }

    return {
      data: result.data,
      success: true,
    };
  } catch (err) {
    console.error("Error in getOAuthProviderConfig:", err);
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      success: false,
    };
  }
}

/**
 * Get OAuth client credentials with fallback to environment variables
 * This is a convenience function for application code that needs OAuth credentials
 *
 * Priority order:
 * 1. Database configuration (if available)
 * 2. Environment variables (as fallback)
 *
 * @param supabase - Supabase client with service role
 * @param provider - OAuth provider name (e.g., "google", "twitch")
 * @returns Client ID and Secret, or null if not configured
 */
export async function getOAuthCredentials(
  supabase: SupabaseClient<Database>,
  provider: "google" | "twitch"
): Promise<{
  clientId: string | null;
  clientSecret: string | null;
}> {
  // Try to get from database first
  const configResult = await getOAuthProviderConfig(supabase, provider);

  if (configResult.success && configResult.data) {
    const { client_id, client_secret } = configResult.data;

    // If both are set in database, use them
    if (client_id && client_secret) {
      return {
        clientId: client_id,
        clientSecret: client_secret,
      };
    }
  }

  // Fallback to environment variables
  const envPrefix =
    provider === "google"
      ? "SUPABASE_AUTH_EXTERNAL_GOOGLE"
      : "SUPABASE_AUTH_EXTERNAL_TWITCH";

  return {
    clientId: process.env[`${envPrefix}_CLIENT_ID`] || null,
    clientSecret: process.env[`${envPrefix}_SECRET`] || null,
  };
}

/**
 * Upsert OAuth provider configuration with Vault encryption
 *
 * @param supabase - Supabase client (must have admin privileges)
 * @param provider - OAuth provider name
 * @param clientId - OAuth Client ID
 * @param clientSecret - OAuth Client Secret (optional, only update if provided)
 * @returns Operation result
 */
export async function upsertOAuthProviderConfig(
  supabase: SupabaseClient<Database>,
  provider: string,
  clientId: string,
  clientSecret?: string
): Promise<{ error?: string; success: boolean }> {
  try {
    const { data, error } = await supabase.rpc("upsert_oauth_provider_config", {
      p_client_id: clientId,
      p_client_secret: clientSecret,
      p_provider: provider,
    });

    if (error) {
      console.error("Error upserting OAuth provider config:", error);
      return {
        error: error.message,
        success: false,
      };
    }

    if (!data || typeof data !== "object") {
      return {
        error: "Invalid response from server",
        success: false,
      };
    }

    const result = data as { error?: string; success: boolean };

    if (!result.success) {
      return {
        error: result.error || "Failed to save OAuth provider configuration",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    console.error("Error in upsertOAuthProviderConfig:", err);
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      success: false,
    };
  }
}

/**
 * Delete OAuth provider configuration and clean up Vault
 *
 * @param supabase - Supabase client (must have admin privileges)
 * @param provider - OAuth provider name
 * @returns Operation result
 */
export async function deleteOAuthProviderConfig(
  supabase: SupabaseClient<Database>,
  provider: string
): Promise<{ error?: string; success: boolean }> {
  try {
    const { data, error } = await supabase.rpc("delete_oauth_provider_config", {
      p_provider: provider,
    });

    if (error) {
      console.error("Error deleting OAuth provider config:", error);
      return {
        error: error.message,
        success: false,
      };
    }

    if (!data || typeof data !== "object") {
      return {
        error: "Invalid response from server",
        success: false,
      };
    }

    const result = data as { error?: string; success: boolean };

    if (!result.success) {
      return {
        error: result.error || "Failed to delete OAuth provider configuration",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    console.error("Error in deleteOAuthProviderConfig:", err);
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      success: false,
    };
  }
}
