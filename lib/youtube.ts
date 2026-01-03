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

    const response = await youtube.members.list({
      filterByMemberChannelId: "mine",
      part: ["snippet"],
    });

    // Check if user is a member of the specified channel
    const isMember = Boolean(
      response.data.items?.some(
        (item) => item.snippet?.memberDetails?.channelId === channelId
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
