import { ApiClient } from "@twurple/api";
import { StaticAuthProvider } from "@twurple/auth";

// Regex patterns for parsing Twitch input
export const TWITCH_ID_REGEX = /^\d+$/;
const TWITCH_URL_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]{4,25})$/;
const TWITCH_USERNAME_REGEX = /^[a-zA-Z0-9_]{4,25}$/;

export interface TwitchFollowCheckResult {
  error?: string;
  isFollowing: boolean;
}

export interface TwitchSubCheckResult {
  error?: string;
  isSubscribed: boolean;
}

export interface TwitchUserLookupResult {
  broadcasterId?: string;
  error?: string;
}

export interface ParsedTwitchInput {
  type: "id" | "username" | "invalid";
  value: string;
}

/**
 * Validate common parameters for Twitch API calls
 */
function validateTwitchParameters(
  userAccessToken: string,
  userId: string,
  broadcasterId: string
): { error?: string; valid: boolean } {
  if (!userAccessToken) {
    return { error: "Missing required parameters", valid: false };
  }

  if (!userId) {
    return { error: "Missing required parameters", valid: false };
  }

  if (!broadcasterId) {
    return { error: "Missing required parameters", valid: false };
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!clientId) {
    return { error: "Twitch client ID not configured", valid: false };
  }

  return { valid: true };
}

/**
 * Create Twurple API client with user access token
 */
function createApiClient(userAccessToken: string): ApiClient {
  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!clientId) {
    throw new Error("Twitch client ID not configured");
  }

  const authProvider = new StaticAuthProvider(clientId, userAccessToken);
  return new ApiClient({ authProvider });
}

/**
 * Create Twurple API client with app access token for server-side operations
 */
function createAppApiClient(appAccessToken: string): ApiClient {
  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!clientId) {
    throw new Error("Twitch client ID not configured");
  }

  const authProvider = new StaticAuthProvider(clientId, appAccessToken);
  return new ApiClient({ authProvider });
}

/**
 * Parse Twitch input to extract username or detect if it's already a numeric ID
 * Supports:
 * - Numeric ID: "123456789"
 * - Username: "ninja"
 * - URL: "https://www.twitch.tv/ninja" or "https://twitch.tv/ninja" or "twitch.tv/ninja"
 */
export function parseTwitchInput(input: string): ParsedTwitchInput {
  const trimmed = input.trim();

  if (!trimmed) {
    return { type: "invalid", value: "" };
  }

  // Check if it's a numeric ID (digits only)
  if (TWITCH_ID_REGEX.test(trimmed)) {
    return { type: "id", value: trimmed };
  }

  // Check if it's a URL
  const match = trimmed.match(TWITCH_URL_REGEX);
  if (match?.[1]) {
    return { type: "username", value: match[1].toLowerCase() };
  }

  // Check if it's a valid username (4-25 characters, alphanumeric + underscore)
  if (TWITCH_USERNAME_REGEX.test(trimmed)) {
    return { type: "username", value: trimmed.toLowerCase() };
  }

  return { type: "invalid", value: trimmed };
}

/**
 * Get Twitch broadcaster ID from username using app access token
 * @param username - Twitch username
 * @param appAccessToken - App access token for Twitch API
 * @returns Promise with broadcaster ID or error
 */
export async function getBroadcasterIdFromUsername(
  username: string,
  appAccessToken: string
): Promise<TwitchUserLookupResult> {
  try {
    if (!username) {
      return { error: "Username is required" };
    }

    if (!appAccessToken) {
      return { error: "App access token is required" };
    }

    const clientId = process.env.TWITCH_CLIENT_ID;
    if (!clientId) {
      return { error: "Twitch client ID not configured" };
    }

    const apiClient = createAppApiClient(appAccessToken);
    const users = await apiClient.users.getUsersByNames([username]);

    if (users.length === 0) {
      return { error: "User not found" };
    }

    return { broadcasterId: users[0].id };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if a user follows a broadcaster on Twitch
 * @param userAccessToken - User's Twitch access token
 * @param userId - Twitch user ID to check
 * @param broadcasterId - Twitch broadcaster ID to check against
 * @returns Promise with follow status
 */
export async function checkFollowStatus(
  userAccessToken: string,
  userId: string,
  broadcasterId: string
): Promise<TwitchFollowCheckResult> {
  try {
    const validation = validateTwitchParameters(
      userAccessToken,
      userId,
      broadcasterId
    );
    if (!validation.valid) {
      return {
        error: validation.error,
        isFollowing: false,
      };
    }

    const apiClient = createApiClient(userAccessToken);
    const follow = await apiClient.channels.getChannelFollowers(
      broadcasterId,
      userId
    );

    return {
      isFollowing: follow.data.length > 0,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      isFollowing: false,
    };
  }
}

/**
 * Check if a user is subscribed to a broadcaster on Twitch
 * @param userAccessToken - User's Twitch access token
 * @param userId - Twitch user ID to check
 * @param broadcasterId - Twitch broadcaster ID to check against
 * @returns Promise with subscription status
 */
export async function checkSubStatus(
  userAccessToken: string,
  userId: string,
  broadcasterId: string
): Promise<TwitchSubCheckResult> {
  try {
    const validation = validateTwitchParameters(
      userAccessToken,
      userId,
      broadcasterId
    );
    if (!validation.valid) {
      return {
        error: validation.error,
        isSubscribed: false,
      };
    }

    const apiClient = createApiClient(userAccessToken);
    const subscription = await apiClient.subscriptions.checkUserSubscription(
      userId,
      broadcasterId
    );

    return {
      isSubscribed: subscription !== null,
    };
  } catch (error) {
    // Twurple throws an error if not subscribed
    if (error instanceof Error && error.message.includes("404")) {
      return {
        isSubscribed: false,
      };
    }

    return {
      error: error instanceof Error ? error.message : "Unknown error",
      isSubscribed: false,
    };
  }
}
