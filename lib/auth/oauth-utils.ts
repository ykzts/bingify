/**
 * Utility functions for OAuth authentication flows
 */

import type { SystemSettings } from "@/lib/schemas/system-settings";
import { getAbsoluteUrl } from "@/lib/utils/url";

/**
 * Builds a callback URL for OAuth redirects
 * @param redirectPath - Optional path to redirect to after authentication (e.g., "/spaces/123")
 * @returns The complete callback URL with redirect parameter if provided
 */
export function buildOAuthCallbackUrl(redirectPath?: string): string {
  const baseUrl = getAbsoluteUrl();
  const callbackUrl = new URL("/auth/callback", baseUrl);

  if (redirectPath) {
    callbackUrl.searchParams.set("redirect", redirectPath);
  }

  return callbackUrl.toString();
}

/**
 * Default OAuth scopes for Google authentication
 * Includes YouTube readonly access for space gatekeeper verification
 *
 * Note: The sensitive scope "youtube.channel-memberships.creator" is not
 * included because:
 * 1. It requires Google OAuth verification before production use
 * 2. The YouTube membership verification feature is not currently supported
 *    (the members.list endpoint requires channel owner credentials)
 *
 * If YouTube membership verification is implemented in the future using
 * a channel-owner flow, this scope should be added conditionally based on
 * system configuration and only after Google OAuth verification is complete.
 */
export const GOOGLE_OAUTH_SCOPES =
  "https://www.googleapis.com/auth/youtube.readonly";

/**
 * Default OAuth scopes for Twitch authentication
 * Includes follower and subscription read access for space gatekeeper verification
 */
export const TWITCH_OAUTH_SCOPES = "user:read:follows user:read:subscriptions";

/**
 * Generates OAuth scopes for Google authentication based on system settings
 * @param settings - System settings containing feature flags
 * @returns OAuth scopes string or undefined if no scopes are needed
 */
export function getGoogleOAuthScopes(
  settings: SystemSettings
): string | undefined {
  if (settings.features.gatekeeper.youtube.enabled) {
    return GOOGLE_OAUTH_SCOPES;
  }
  return undefined;
}

/**
 * Generates OAuth scopes for Twitch authentication based on system settings
 * @param settings - System settings containing feature flags
 * @returns OAuth scopes string or undefined if no scopes are needed
 */
export function getTwitchOAuthScopes(
  settings: SystemSettings
): string | undefined {
  if (settings.features.gatekeeper.twitch.enabled) {
    return TWITCH_OAUTH_SCOPES;
  }
  return undefined;
}

/**
 * Generates OAuth scopes for a given provider based on system settings
 * @param provider - OAuth provider name
 * @param settings - System settings containing feature flags
 * @returns OAuth scopes string or undefined if no scopes are needed
 */
export function getScopesForProvider(
  provider: string,
  settings: SystemSettings
): string | undefined {
  switch (provider) {
    case "google":
      return getGoogleOAuthScopes(settings);
    case "twitch":
      return getTwitchOAuthScopes(settings);
    default:
      return undefined;
  }
}
