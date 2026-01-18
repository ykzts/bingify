import type { SupabaseClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("AdminAuthProviders");

  try {
    const result = await supabase.rpc("get_oauth_provider_config", {
      p_provider: provider,
    });

    // Handle undefined or null result (happens in tests when RPC is not mocked)
    if (!result || result === undefined) {
      return {
        error: t("errorRpcNotAvailable"),
        success: false,
      };
    }

    const { data, error } = result;

    if (error) {
      console.error("Error fetching OAuth provider config:", error);

      // Check if the error is due to missing function (migration not applied)
      if (
        error.message?.includes("Could not find the function") ||
        (error.message?.includes("function") &&
          error.message?.includes("does not exist"))
      ) {
        return {
          error: t("errorMigrationNotApplied"),
          success: false,
        };
      }

      return {
        error: t("errorFetchFailed"),
        success: false,
      };
    }

    if (!data || typeof data !== "object") {
      return {
        error: t("errorInvalidResponse"),
        success: false,
      };
    }

    const typedResult = data as unknown as {
      data?: OAuthProviderConfig;
      success: boolean;
    };

    // If no config in database, return success with null data (will fallback to env vars)
    if (!typedResult.success || !typedResult.data) {
      return {
        data: undefined,
        success: true,
      };
    }

    return {
      data: typedResult.data,
      success: true,
    };
  } catch (err) {
    console.error("Error in getOAuthProviderConfig:", err);

    // Check if the error is due to missing function
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (
      errorMsg.includes("Could not find the function") ||
      (errorMsg.includes("function") && errorMsg.includes("does not exist"))
    ) {
      return {
        error: t("errorMigrationNotApplied"),
        success: false,
      };
    }

    return {
      error: t("errorGeneric"),
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
  try {
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
  } catch (_error) {
    // Database unavailable or RPC doesn't exist - fall through to env vars
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
  const t = await getTranslations("AdminAuthProviders");

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
        error: t("errorInvalidResponse"),
        success: false,
      };
    }

    const result = data as { error?: string; success: boolean };

    if (!result.success) {
      return {
        error: result.error || t("errorSaveFailed"),
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    console.error("Error in upsertOAuthProviderConfig:", err);
    return {
      error: err instanceof Error ? err.message : t("errorGeneric"),
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
  const t = await getTranslations("AdminAuthProviders");

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
        error: t("errorInvalidResponse"),
        success: false,
      };
    }

    const result = data as { error?: string; success: boolean };

    if (!result.success) {
      return {
        error: result.error || t("errorDeleteFailed"),
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    console.error("Error in deleteOAuthProviderConfig:", err);
    return {
      error: err instanceof Error ? err.message : t("errorGeneric"),
      success: false,
    };
  }
}
