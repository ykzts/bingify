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
        error: "認証が必要です",
        success: false,
      };
    }

    // ユーザーのYouTube OAuthトークンを取得
    const tokenResult = await getOAuthToken(supabase, "google");

    if (!(tokenResult.success && tokenResult.access_token)) {
      return {
        error:
          "YouTubeアカウントが連携されていません。アカウント設定からYouTubeアカウントを連携してください。",
        success: false,
      };
    }

    // ユーザーのチャンネルIDを取得
    const channelResult = await getUserYouTubeChannelId(
      tokenResult.access_token
    );

    if (channelResult.error || !channelResult.channelId) {
      // エラーメッセージを日本語に変換
      let errorMessage =
        channelResult.error || "チャンネルが見つかりませんでした";

      // 英語のエラーメッセージを日本語に変換
      if (errorMessage.includes("Token has expired or is invalid")) {
        errorMessage =
          "トークンの有効期限が切れているか無効です。YouTubeアカウントを再度連携してください。";
      } else if (errorMessage.includes("Insufficient permissions")) {
        errorMessage =
          "権限が不足しています。YouTubeアカウントに必要な権限があることを確認してください。";
      } else if (errorMessage === "No channel found for this user") {
        errorMessage =
          "YouTubeチャンネルが見つかりませんでした。YouTubeアカウントにチャンネルがあることを確認してください。";
      } else if (errorMessage === "Missing access token") {
        errorMessage = "アクセストークンが見つかりません";
      }

      return {
        error: errorMessage,
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
      error: "チャンネルIDの取得中にエラーが発生しました",
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
        error: "認証が必要です",
        success: false,
      };
    }

    // ユーザーのTwitch OAuthトークンを取得
    const tokenResult = await getOAuthToken(supabase, "twitch");

    if (!(tokenResult.success && tokenResult.access_token)) {
      return {
        error:
          "Twitchアカウントが連携されていません。アカウント設定からTwitchアカウントを連携してください。",
        success: false,
      };
    }

    // ユーザーのTwitch IDを取得
    const userIdResult = await getUserTwitchId(tokenResult.access_token);

    if (userIdResult.error || !userIdResult.userId) {
      return {
        error:
          userIdResult.error ||
          "Twitchユーザー情報の取得に失敗しました。もう一度お試しください。",
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
      error: "ブロードキャスターIDの取得中にエラーが発生しました",
      success: false,
    };
  }
}
