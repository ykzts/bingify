import { ApiClient } from "@twurple/api";
import { StaticAuthProvider } from "@twurple/auth";

export interface TwitchFollowCheckResult {
  error?: string;
  isFollowing: boolean;
}

export interface TwitchSubCheckResult {
  error?: string;
  isSubscribed: boolean;
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
