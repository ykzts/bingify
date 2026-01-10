"use server";

import {
  registerTwitchBroadcasterMetadata as registerTwitchMetadata,
  registerYouTubeChannelMetadata as registerYouTubeMetadata,
} from "@/lib/data/social-metadata-helpers";
import { createClient } from "@/lib/supabase/server";

/**
 * YouTubeチャンネルのメタデータを即座に登録
 */
export async function registerYouTubeChannelMetadata(channelId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Unauthorized", success: false };
    }

    // Get OAuth token for YouTube API
    const { data: tokenData } = await supabase.auth.getSession();
    const youtubeToken = tokenData.session?.provider_token;

    if (!youtubeToken) {
      return {
        error: "YouTube OAuth token not found",
        success: false,
      };
    }

    const result = await registerYouTubeMetadata(
      supabase,
      channelId,
      youtubeToken,
      user.id
    );

    return result;
  } catch (error) {
    console.error("Error registering YouTube metadata:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      success: false,
    };
  }
}

/**
 * Twitchブロードキャスターのメタデータを即座に登録
 */
export async function registerTwitchBroadcasterMetadata(broadcasterId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Unauthorized", success: false };
    }

    const result = await registerTwitchMetadata(
      supabase,
      broadcasterId,
      user.id
    );

    return result;
  } catch (error) {
    console.error("Error registering Twitch metadata:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      success: false,
    };
  }
}
