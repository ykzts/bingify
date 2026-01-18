import { getOAuthCredentials } from "@/lib/data/oauth-provider-config";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cache for OAuth credentials to avoid repeated database queries
 */
const credentialsCache = new Map<
  string,
  {
    clientId: string | null;
    clientSecret: string | null;
    expiresAt: number;
  }
>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get Twitch OAuth credentials with database fallback to environment variables
 * This function caches results for 5 minutes to avoid repeated database queries
 *
 * @returns Twitch Client ID and Secret
 */
export async function getTwitchCredentials(): Promise<{
  clientId: string | null;
  clientSecret: string | null;
}> {
  const cacheKey = "twitch";
  const cached = credentialsCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return {
      clientId: cached.clientId,
      clientSecret: cached.clientSecret,
    };
  }

  // Try database first, but fallback to env vars if anything fails
  try {
    const supabase = createAdminClient();
    const result = await getOAuthCredentials(supabase, "twitch");

    // Cache the result
    credentialsCache.set(cacheKey, {
      clientId: result.clientId,
      clientSecret: result.clientSecret,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return result;
  } catch (_error) {
    // Silent fallback to environment variables
    // This happens when:
    // - createAdminClient() fails (missing env vars in tests)
    // - Database is unavailable
    // - RPC function doesn't exist
    const fallback = {
      clientId: process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID || null,
      clientSecret: process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_SECRET || null,
    };

    // Cache the fallback result too
    credentialsCache.set(cacheKey, {
      ...fallback,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return fallback;
  }
}

/**
 * Get Google OAuth credentials with database fallback to environment variables
 * This function caches results for 5 minutes to avoid repeated database queries
 *
 * @returns Google Client ID and Secret
 */
export async function getGoogleCredentials(): Promise<{
  clientId: string | null;
  clientSecret: string | null;
}> {
  const cacheKey = "google";
  const cached = credentialsCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return {
      clientId: cached.clientId,
      clientSecret: cached.clientSecret,
    };
  }

  // Try database first, but fallback to env vars if anything fails
  try {
    const supabase = createAdminClient();
    const result = await getOAuthCredentials(supabase, "google");

    // Cache the result
    credentialsCache.set(cacheKey, {
      clientId: result.clientId,
      clientSecret: result.clientSecret,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return result;
  } catch (_error) {
    // Silent fallback to environment variables
    // This happens when:
    // - createAdminClient() fails (missing env vars in tests)
    // - Database is unavailable
    // - RPC function doesn't exist
    const fallback = {
      clientId: process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID || null,
      clientSecret: process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET || null,
    };

    // Cache the fallback result too
    credentialsCache.set(cacheKey, {
      ...fallback,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return fallback;
  }
}

/**
 * Clear the credentials cache
 * Useful after updating OAuth configuration in the admin dashboard
 */
export function clearCredentialsCache(): void {
  credentialsCache.clear();
}
