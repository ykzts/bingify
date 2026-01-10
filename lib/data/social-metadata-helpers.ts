import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppAccessToken } from "@/lib/twitch";
import type { Database } from "@/types/supabase";
import { fetchAndCacheTwitchBroadcasterMetadata } from "./twitch-metadata";
import { fetchAndCacheYouTubeChannelMetadata } from "./youtube-metadata";

/**
 * スペース設定更新時にYouTubeチャンネルメタデータを登録
 * 既存のキャッシュがあり有効期限内であれば何もしない
 * キャッシュがないか期限切れの場合、APIから取得してDBに保存
 *
 * @param supabase - Supabaseクライアント
 * @param channelId - YouTubeチャンネルID
 * @param userAccessToken - ユーザーのGoogle OAuthアクセストークン
 * @param userId - ユーザーID（created_by用）
 * @returns 成功時はtrue、失敗時はfalse
 */
export async function registerYouTubeChannelMetadata(
  supabase: SupabaseClient<Database>,
  channelId: string,
  userAccessToken: string,
  userId: string
): Promise<{ error?: string; success: boolean }> {
  try {
    await fetchAndCacheYouTubeChannelMetadata(
      supabase,
      channelId,
      userAccessToken,
      userId
    );
    return { success: true };
  } catch (error) {
    console.error("Failed to register YouTube channel metadata:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      success: false,
    };
  }
}

/**
 * スペース設定更新時にTwitchブロードキャスターメタデータを登録
 * 既存のキャッシュがあり有効期限内であれば何もしない
 * キャッシュがないか期限切れの場合、APIから取得してDBに保存
 *
 * @param supabase - Supabaseクライアント
 * @param broadcasterId - Twitchブロードキャスター ID
 * @param userId - ユーザーID（created_by用）
 * @returns 成功時はtrue、失敗時はfalse
 */
export async function registerTwitchBroadcasterMetadata(
  supabase: SupabaseClient<Database>,
  broadcasterId: string,
  userId: string
): Promise<{ error?: string; success: boolean }> {
  try {
    // Twitch APIはApp Access Tokenを使用してメタデータを取得
    const appAccessToken = await getAppAccessToken();
    if (!appAccessToken) {
      return {
        error: "Failed to get Twitch app access token",
        success: false,
      };
    }

    await fetchAndCacheTwitchBroadcasterMetadata(
      supabase,
      broadcasterId,
      appAccessToken,
      userId
    );
    return { success: true };
  } catch (error) {
    console.error("Failed to register Twitch broadcaster metadata:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      success: false,
    };
  }
}
