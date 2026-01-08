/**
 * Utility functions for OAuth authentication flows
 */

import type { SystemSettings } from "@/lib/schemas/system-settings";
import { getAbsoluteUrl } from "@/lib/utils/url";

/**
 * Builds a callback URL for OAuth redirects
 * @param provider - OAuth provider name (e.g., "google", "twitch")
 * @param redirectPath - Optional path to redirect to after authentication (e.g., "/spaces/123")
 * @returns The complete callback URL with redirect parameter if provided
 */
export function buildOAuthCallbackUrl(
  provider: string,
  redirectPath?: string
): string {
  const baseUrl = getAbsoluteUrl();
  const callbackUrl = new URL(`/auth/${provider}/callback`, baseUrl);

  if (redirectPath) {
    callbackUrl.searchParams.set("redirect", redirectPath);
  }

  return callbackUrl.toString();
}

/**
 * OAuth scope for YouTube subscription verification
 */
export const YOUTUBE_SUBSCRIPTION_SCOPE =
  "https://www.googleapis.com/auth/youtube.readonly";

/**
 * OAuth scope for YouTube membership verification
 * Note: This requires channel owner credentials and Google OAuth verification before production use.
 */
export const YOUTUBE_MEMBERSHIP_SCOPE =
  "https://www.googleapis.com/auth/youtube.channel-memberships.creator";

/**
 * OAuth scope for Twitch follower verification
 */
export const TWITCH_FOLLOWER_SCOPE = "user:read:follows";

/**
 * OAuth scope for Twitch subscription verification
 */
export const TWITCH_SUBSCRIPTION_SCOPE = "user:read:subscriptions";

/**
 * Default OAuth scopes for Google authentication (all YouTube features)
 * Used for account linking and scenarios where all scopes are needed
 * Includes both subscription and membership verification scopes
 */
export const GOOGLE_OAUTH_SCOPES = `${YOUTUBE_SUBSCRIPTION_SCOPE} ${YOUTUBE_MEMBERSHIP_SCOPE}`;

/**
 * Default OAuth scopes for Twitch authentication (all features)
 * Used for account linking and scenarios where all scopes are needed
 * Includes both follower and subscription verification scopes
 */
export const TWITCH_OAUTH_SCOPES = `${TWITCH_FOLLOWER_SCOPE} ${TWITCH_SUBSCRIPTION_SCOPE}`;

/**
 * Generates OAuth scopes for Google authentication based on system settings
 * Only requests scopes for enabled features
 * @param settings - System settings containing feature flags
 * @returns OAuth scopes string or undefined if no scopes are needed
 */
export function getGoogleOAuthScopes(
  settings: SystemSettings
): string | undefined {
  const scopes: string[] = [];

  // YouTube機能が有効な場合のみスコープを追加
  if (settings.features.gatekeeper.youtube.enabled) {
    // サブスクライバーチェックが有効な場合
    if (settings.features.gatekeeper.youtube.subscriber.enabled) {
      scopes.push(YOUTUBE_SUBSCRIPTION_SCOPE);
    }

    // メンバーシップチェックが有効な場合
    if (settings.features.gatekeeper.youtube.member.enabled) {
      scopes.push(YOUTUBE_MEMBERSHIP_SCOPE);
    }
  }

  return scopes.length > 0 ? scopes.join(" ") : undefined;
}

/**
 * Generates OAuth scopes for Twitch authentication based on system settings
 * Only requests scopes for enabled features
 * @param settings - System settings containing feature flags
 * @returns OAuth scopes string or undefined if no scopes are needed
 */
export function getTwitchOAuthScopes(
  settings: SystemSettings
): string | undefined {
  const scopes: string[] = [];

  // Twitch機能が有効な場合のみスコープを追加
  if (settings.features.gatekeeper.twitch.enabled) {
    // フォロワーチェックが有効な場合
    if (settings.features.gatekeeper.twitch.follower.enabled) {
      scopes.push(TWITCH_FOLLOWER_SCOPE);
    }

    // サブスクライバーチェックが有効な場合
    if (settings.features.gatekeeper.twitch.subscriber.enabled) {
      scopes.push(TWITCH_SUBSCRIPTION_SCOPE);
    }
  }

  return scopes.length > 0 ? scopes.join(" ") : undefined;
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
