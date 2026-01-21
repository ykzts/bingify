"use server";

import { getTranslations } from "next-intl/server";
import {
  registerTwitchBroadcasterMetadata as registerTwitchMetadata,
  registerYouTubeChannelMetadata as registerYouTubeMetadata,
} from "@/lib/data/social-metadata-helpers";
import { getOAuthToken } from "@/lib/oauth/token-storage";
import { createClient } from "@/lib/supabase/server";

/**
 * YouTubeチャンネルのメタデータを即座に登録
 */
export async function registerYouTubeChannelMetadata(channelId: string) {
  const t = await getTranslations("RegisterMetadata");

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: t("errorUnauthorized"), success: false };
    }

    // Get operator's YouTube OAuth token using the proper token storage function
    const tokenResult = await getOAuthToken(supabase, "google");

    if (!(tokenResult.success && tokenResult.access_token)) {
      return {
        error: t("errorYouTubeTokenNotFound"),
        success: false,
      };
    }

    const result = await registerYouTubeMetadata(
      supabase,
      channelId,
      tokenResult.access_token,
      user.id
    );

    // If helper function returns an error, translate it
    if (!result.success && result.error) {
      return {
        error: t("errorGeneric"),
        success: false,
      };
    }

    return result;
  } catch (error) {
    console.error("Error registering YouTube metadata:", error);
    return {
      error: t("errorGeneric"),
      success: false,
    };
  }
}

/**
 * Twitchブロードキャスターのメタデータを即座に登録
 */
export async function registerTwitchBroadcasterMetadata(broadcasterId: string) {
  const t = await getTranslations("RegisterMetadata");

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: t("errorUnauthorized"), success: false };
    }

    // Get operator's Twitch OAuth token
    const tokenResult = await getOAuthToken(supabase, "twitch");

    if (!(tokenResult.success && tokenResult.access_token)) {
      return {
        error: t("errorTwitchTokenNotFound"),
        success: false,
      };
    }

    const result = await registerTwitchMetadata(
      supabase,
      broadcasterId,
      tokenResult.access_token,
      user.id
    );

    // If helper function returns an error, translate it
    if (!result.success && result.error) {
      return {
        error: t("errorGeneric"),
        success: false,
      };
    }

    return result;
  } catch (error) {
    console.error("Error registering Twitch metadata:", error);
    return {
      error: t("errorGeneric"),
      success: false,
    };
  }
}
