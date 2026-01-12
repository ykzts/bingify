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

export interface VerifiedSocialChannels {
  youtube?: string;
  twitch?: string;
}

/**
 * 操作者（ログインユーザー）のYouTubeチャンネルIDを取得し、DBに保存する
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
      } else if (channelResult.error === "ERROR_YOUTUBE_UNKNOWN") {
        errorKey = "errorYoutubeUnknown";
      } else if (channelResult.error === "No channel found for this user") {
        errorKey = "errorYoutubeChannelNotFound";
      }

      return {
        error: errorKey,
        success: false,
      };
    }

    // 検証済みチャンネルIDをDBに保存（upsert）
    const { error: dbError } = await supabase
      .from("verified_social_channels")
      .upsert(
        {
          channel_id: channelResult.channelId,
          provider: "youtube",
          user_id: user.id,
          verified_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,provider",
        }
      );

    if (dbError) {
      console.error("Error saving verified YouTube channel:", dbError);
      // DB保存エラーでも取得には成功しているので、successはtrueのまま返す
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
 * 操作者（ログインユーザー）のTwitchブロードキャスターIDを取得し、DBに保存する
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

    // 検証済みブロードキャスターIDをDBに保存（upsert）
    const { error: dbError } = await supabase
      .from("verified_social_channels")
      .upsert(
        {
          channel_id: userIdResult.userId,
          provider: "twitch",
          user_id: user.id,
          verified_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,provider",
        }
      );

    if (dbError) {
      console.error("Error saving verified Twitch broadcaster:", dbError);
      // DB保存エラーでも取得には成功しているので、successはtrueのまま返す
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

/**
 * 操作者（ログインユーザー）の検証済みソーシャルチャンネルIDを取得する
 * DBに保存されている検証済みIDを返す
 *
 * @returns 検証済みYouTubeチャンネルID、Twitchブロードキャスター ID
 */
export async function getVerifiedSocialChannels(): Promise<VerifiedSocialChannels> {
  try {
    // Supabaseクライアントを作成し、ユーザーを取得
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {};
    }

    // ユーザーの検証済みチャンネルを取得
    const { data, error } = await supabase
      .from("verified_social_channels")
      .select("provider, channel_id")
      .eq("user_id", user.id);

    if (error || !data) {
      console.error("Error fetching verified social channels:", error);
      return {};
    }

    // プロバイダーごとにマッピング
    const result: VerifiedSocialChannels = {};
    for (const record of data) {
      if (record.provider === "youtube") {
        result.youtube = record.channel_id;
      } else if (record.provider === "twitch") {
        result.twitch = record.channel_id;
      }
    }

    return result;
  } catch (error) {
    console.error("Error getting verified social channels:", error);
    return {};
  }
}
