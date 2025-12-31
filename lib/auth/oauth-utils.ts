/**
 * Utility functions for OAuth authentication flows
 */

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
 */
export const GOOGLE_OAUTH_SCOPES =
  "https://www.googleapis.com/auth/youtube.readonly";

/**
 * Default OAuth scopes for Twitch authentication
 * Includes follower and subscription read access for space gatekeeper verification
 */
export const TWITCH_OAUTH_SCOPES = "user:read:follows user:read:subscriptions";
