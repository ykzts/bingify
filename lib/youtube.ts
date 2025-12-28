import { youtube_v3 } from "@googleapis/youtube";

export interface YouTubeSubscriptionCheckResult {
  error?: string;
  isSubscribed: boolean;
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
