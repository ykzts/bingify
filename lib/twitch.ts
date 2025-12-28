export interface TwitchFollowCheckResult {
  error?: string;
  isFollowing: boolean;
}

export interface TwitchSubCheckResult {
  error?: string;
  isSubscribed: boolean;
}

interface ValidationResult {
  error?: string;
  valid: boolean;
}

/**
 * Validate common parameters for Twitch API calls
 */
function validateTwitchParameters(
  userAccessToken: string,
  userId: string,
  broadcasterId: string
): ValidationResult {
  if (!userAccessToken) {
    return { error: "Missing required parameters", valid: false };
  }

  if (!userId) {
    return { error: "Missing required parameters", valid: false };
  }

  if (!broadcasterId) {
    return { error: "Missing required parameters", valid: false };
  }

  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
  if (!clientId) {
    return { error: "Twitch client ID not configured", valid: false };
  }

  return { valid: true };
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

    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    const url = new URL("https://api.twitch.tv/helix/channels/followers");
    url.searchParams.append("user_id", userId);
    url.searchParams.append("broadcaster_id", broadcasterId);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
        "Client-Id": clientId as string,
      },
    });

    if (!response.ok) {
      return {
        error: `Twitch API error: ${response.status} ${response.statusText}`,
        isFollowing: false,
      };
    }

    const data = await response.json();
    const isFollowing = Boolean(data.data && data.data.length > 0);

    return {
      isFollowing,
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

    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    const url = new URL("https://api.twitch.tv/helix/subscriptions/user");
    url.searchParams.append("user_id", userId);
    url.searchParams.append("broadcaster_id", broadcasterId);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
        "Client-Id": clientId as string,
      },
    });

    if (!response.ok) {
      // 404 means not subscribed
      if (response.status === 404) {
        return {
          isSubscribed: false,
        };
      }

      return {
        error: `Twitch API error: ${response.status} ${response.statusText}`,
        isSubscribed: false,
      };
    }

    const data = await response.json();
    const isSubscribed = Boolean(data.data && data.data.length > 0);

    return {
      isSubscribed,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      isSubscribed: false,
    };
  }
}
