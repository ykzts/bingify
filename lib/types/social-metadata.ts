import type { Database } from "@/types/supabase";

/**
 * YouTubeチャンネルのメタデータ型定義
 * Supabaseの自動生成型を再エクスポート
 */
export type YouTubeChannelMetadata =
  Database["public"]["Tables"]["youtube_channels"]["Row"];

/**
 * Twitchブロードキャスターのメタデータ型定義
 * Supabaseの自動生成型を再エクスポート
 */
export type TwitchBroadcasterMetadata =
  Database["public"]["Tables"]["twitch_broadcasters"]["Row"];

/**
 * ソーシャルメタデータの統一型（YouTubeまたはTwitch）
 */
export type SocialMetadata = YouTubeChannelMetadata | TwitchBroadcasterMetadata;

/**
 * YouTubeチャンネルメタデータの挿入用の型
 * Supabaseの自動生成型を再エクスポート
 */
export type YouTubeChannelInsert =
  Database["public"]["Tables"]["youtube_channels"]["Insert"];

/**
 * Twitchブロードキャスターメタデータの挿入用の型
 * Supabaseの自動生成型を再エクスポート
 */
export type TwitchBroadcasterInsert =
  Database["public"]["Tables"]["twitch_broadcasters"]["Insert"];

/**
 * メタデータのキャッシュ有効期間（ミリ秒）
 * デフォルトは24時間
 */
export const DEFAULT_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * メタデータのキャッシュ更新が必要かどうかをチェック
 * @param fetchedAt - 最終取得日時（ISO 8601形式）
 * @param maxAgeMs - キャッシュの最大有効期間（ミリ秒）。デフォルトは24時間
 * @returns キャッシュが古く、更新が必要な場合はtrue
 */
export function shouldRefreshMetadata(
  fetchedAt: string,
  maxAgeMs: number = DEFAULT_CACHE_MAX_AGE_MS
): boolean {
  const lastFetch = new Date(fetchedAt);
  const now = new Date();
  return now.getTime() - lastFetch.getTime() > maxAgeMs;
}
