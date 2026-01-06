"use server";

import { getOAuthToken } from "@/lib/oauth/token-storage";
import { createClient } from "@/lib/supabase/server";
import { getUserTwitchId } from "@/lib/twitch";
import { getUserYouTubeChannelId } from "@/lib/youtube";

export interface UserChannelResult {
  channelId?: string;
  error?: string;
  success: boolean;
}

/**
 * 操作者（ログインユーザー）のYouTubeチャンネルIDを取得する
 * ユーザー自身のOAuthトークンを使用してチャンネルIDを取得
 *
 * @returns ユーザーのチャンネルID or エラー
 */
export async function getOperatorYouTubeChannelId(): Promise<UserChannelResult> {
  try {
    // Supabaseクライアントを作成し、ユーザーを取得
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        error: "errorAuthRequired",
        success: false,
      };
    }

    // ユーザーのYouTube OAuthトークンを取得
    const tokenResult = await getOAuthToken(supabase, "google");

    if (!(tokenResult.success && tokenResult.access_token)) {
      return {
        error: "errorYoutubeNotLinked",
        success: false,
      };
    }

    // ユーザーのチャンネルIDを取得
    const channelResult = await getUserYouTubeChannelId(
      tokenResult.access_token
    );

    if (channelResult.error || !channelResult.channelId) {
      // エラーキーをマッピング
      let errorKey = "youtubeChannelIdConvertError";

      if (channelResult.error === "ERROR_YOUTUBE_TOKEN_EXPIRED") {
        errorKey = "errorYoutubeTokenExpired";
      } else if (
        channelResult.error === "ERROR_YOUTUBE_INSUFFICIENT_PERMISSIONS"
      ) {
        errorKey = "errorYoutubeInsufficientPermissions";
      } else if (channelResult.error === "No channel found for this user") {
        errorKey = "errorYoutubeChannelNotFound";
      }

      return {
        error: errorKey,
        success: false,
      };
    }

    return {
      channelId: channelResult.channelId,
      success: true,
    };
  } catch (error) {
    console.error("Error getting operator YouTube channel ID:", error);
    return {
      error: "youtubeChannelIdConvertError",
      success: false,
    };
  }
}

/**
 * 操作者（ログインユーザー）のTwitchブロードキャスターIDを取得する
 * ユーザー自身のOAuthトークンを使用してユーザーIDを取得
 *
 * @returns ユーザーのブロードキャスターID（ユーザーID） or エラー
 */
export async function getOperatorTwitchBroadcasterId(): Promise<UserChannelResult> {
  try {
    // Supabaseクライアントを作成し、ユーザーを取得
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        error: "errorAuthRequired",
        success: false,
      };
    }

    // ユーザーのTwitch OAuthトークンを取得
    const tokenResult = await getOAuthToken(supabase, "twitch");

    if (!(tokenResult.success && tokenResult.access_token)) {
      return {
        error: "errorTwitchNotLinked",
        success: false,
      };
    }

    // ユーザーのTwitch IDを取得
    const userIdResult = await getUserTwitchId(tokenResult.access_token);

    if (userIdResult.error || !userIdResult.userId) {
      return {
        error: userIdResult.error || "twitchBroadcasterIdConvertError",
        success: false,
      };
    }

    return {
      channelId: userIdResult.userId,
      success: true,
    };
  } catch (error) {
    console.error("Error getting operator Twitch broadcaster ID:", error);
    return {
      error: "twitchBroadcasterIdConvertError",
      success: false,
    };
  }
}
