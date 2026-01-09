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
export type SocialMetadata =
  | YouTubeChannelMetadata
  | TwitchBroadcasterMetadata;

/**
 * YouTubeチャンネルメタデータの挿入/更新用の型
 */
export interface YouTubeChannelInsert {
  channel_id: string;
  channel_title?: string;
  created_by?: string;
  custom_url?: string;
  description?: string;
  fetch_error?: string;
  fetched_at?: string;
  handle?: string;
  thumbnail_url?: string;
}

/**
 * Twitchブロードキャスターメタデータの挿入/更新用の型
 */
export interface TwitchBroadcasterInsert {
  broadcaster_id: string;
  created_by?: string;
  description?: string;
  display_name?: string;
  fetch_error?: string;
  fetched_at?: string;
  profile_image_url?: string;
  username?: string;
}

/**
 * メタデータのキャッシュ更新が必要かどうかをチェック
 * デフォルトは24時間（1日）
 */
export function shouldRefreshMetadata(
  fetchedAt: string,
  maxAgeMs: number = 24 * 60 * 60 * 1000
): boolean {
  const lastFetch = new Date(fetchedAt);
  const now = new Date();
  return now.getTime() - lastFetch.getTime() > maxAgeMs;
}
