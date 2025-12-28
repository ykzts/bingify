export interface YouTubeSubscriptionCheckResult {
  isSubscribed: boolean;
  error?: string;
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

    const url = new URL("https://www.googleapis.com/youtube/v3/subscriptions");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("mine", "true");
    url.searchParams.set("forChannelId", channelId);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("YouTube API error:", errorData);
      return {
        error: `YouTube API error: ${response.status}`,
        isSubscribed: false,
      };
    }

    const data = await response.json();

    const isSubscribed = data.items && data.items.length > 0;

    return {
      isSubscribed,
    };
  } catch (error) {
    console.error("Error checking YouTube subscription:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      isSubscribed: false,
    };
  }
}
