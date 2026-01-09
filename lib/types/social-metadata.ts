/**
 * YouTubeチャンネルのメタデータ型定義
 */
export interface YouTubeChannelMetadata {
  broadcaster_id?: never;
  channel_id: string;
  channel_title: string | null;
  created_at: string;
  created_by: string | null;
  custom_url: string | null;
  description: string | null;
  display_name?: never;
  fetch_error: string | null;
  fetched_at: string;
  handle: string | null;
  id: string;
  profile_image_url?: never;
  thumbnail_url: string | null;
  updated_at: string;
  username?: never;
}

/**
 * Twitchブロードキャスターのメタデータ型定義
 */
export interface TwitchBroadcasterMetadata {
  broadcaster_id: string;
  channel_id?: never;
  channel_title?: never;
  created_at: string;
  created_by: string | null;
  custom_url?: never;
  description: string | null;
  display_name: string | null;
  fetch_error: string | null;
  fetched_at: string;
  handle?: never;
  id: string;
  profile_image_url: string | null;
  thumbnail_url?: never;
  updated_at: string;
  username: string | null;
}

/**
 * ソーシャルメタデータの統一型（YouTubeまたはTwitch）
 */
export type SocialMetadata = YouTubeChannelMetadata | TwitchBroadcasterMetadata;

/**
 * YouTubeチャンネルメタデータの挿入/更新用の型
 */
export interface YouTubeChannelInsert {
  channel_id: string;
  channel_title?: string | null;
  created_by?: string | null;
  custom_url?: string | null;
  description?: string | null;
  fetch_error?: string | null;
  fetched_at?: string;
  handle?: string | null;
  thumbnail_url?: string | null;
}

/**
 * Twitchブロードキャスターメタデータの挿入/更新用の型
 */
export interface TwitchBroadcasterInsert {
  broadcaster_id: string;
  created_by?: string | null;
  description?: string | null;
  display_name?: string | null;
  fetch_error?: string | null;
  fetched_at?: string;
  profile_image_url?: string | null;
  username?: string | null;
}

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
