import { youtube_v3 } from "@googleapis/youtube";

export interface YouTubeSubscriptionCheckResult {
  error?: string;
  isSubscribed: boolean;
}

export interface YouTubeMembershipCheckResult {
  error?: string;
  isMember: boolean;
}

export async function checkSubscriptionStatus(
  userAccessToken: string,
  channelId: string
): Promise<YouTubeSubscriptionCheckResult> {
  try {
    if (!(userAccessToken && channelId)) {
      return {
        error: "Missing required parameters",
        isSubscribed: false,
      };
    }

    const youtube = new youtube_v3.Youtube({
      auth: userAccessToken,
    });

    const response = await youtube.subscriptions.list({
      forChannelId: channelId,
      mine: true,
      part: ["snippet"],
    });

    const isSubscribed = Boolean(
      response.data.items && response.data.items.length > 0
    );

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

/**
 * Check if a user is a member of a YouTube channel
 *
 * IMPORTANT: YouTube membership verification is currently not supported.
 *
 * The YouTube Data API v3 does not provide an endpoint for users to check
 * their own membership status. The members.list endpoint requires channel
 * owner credentials and will return 403 errors when called with regular
 * user tokens.
 *
 * To implement YouTube membership verification, consider these alternatives:
 * 1. Channel-owner flow: Require channel owners to verify members through
 *    their own OAuth credentials and store verification tokens
 * 2. Webhooks: Integrate with YouTube webhooks for membership status changes
 * 3. Manual verification: Implement a manual verification process
 *
 * @param userAccessToken - OAuth access token for the user (not used)
 * @param channelId - ID of the channel to check membership for (not used)
 * @returns Promise indicating the feature is not supported
 */
export function checkMembershipStatus(
  userAccessToken: string,
  channelId: string
): Promise<YouTubeMembershipCheckResult> {
  // Validate required parameters
  if (!(userAccessToken && channelId)) {
    return Promise.resolve({
      error: "Missing required parameters",
      isMember: false,
    });
  }

  // Return error indicating this feature is not supported
  // The members.list endpoint requires channel owner credentials and will
  // produce 403 errors when called with regular user access tokens
  return Promise.resolve({
    error:
      "YouTube membership verification is not supported. The API requires channel owner credentials.",
    isMember: false,
  });
}
