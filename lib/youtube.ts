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
 * IMPORTANT LIMITATION:
 * The YouTube Data API v3 does not provide a direct endpoint for users to check
 * their own membership status. The members.list endpoint requires the channel
 * owner's credentials and is designed for owners to list their members.
 *
 * This function attempts to use the members.list endpoint with the user's token
 * and filterByMemberChannelId parameter to check membership, but this approach
 * has limitations:
 *
 * 1. The user needs to have appropriate OAuth scopes
 * 2. The API behavior may not work as intended for checking own membership
 * 3. This is not the official/documented way to check membership status
 *
 * Alternative approaches that could be considered:
 * - Store membership verification tokens provided by channel owners
 * - Use webhooks/notifications from YouTube when membership changes
 * - Manual verification process
 *
 * @param userAccessToken - OAuth access token for the user
 * @param channelId - ID of the channel to check membership for
 * @returns Promise with isMember status and optional error
 */
export async function checkMembershipStatus(
  userAccessToken: string,
  channelId: string
): Promise<YouTubeMembershipCheckResult> {
  try {
    if (!(userAccessToken && channelId)) {
      return {
        error: "Missing required parameters",
        isMember: false,
      };
    }

    const youtube = new youtube_v3.Youtube({
      auth: userAccessToken,
    });

    // Attempt to check membership using members.list with filterByMemberChannelId
    // Note: This may not work as expected due to API limitations mentioned above
    const response = await youtube.members.list({
      filterByMemberChannelId: "mine",
      part: ["snippet"],
    });

    // Check if user is a member of the specified channel
    const isMember = Boolean(
      response.data.items?.some(
        (item) => item.snippet?.creatorChannelId === channelId
      )
    );

    return {
      isMember,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      isMember: false,
    };
  }
}
