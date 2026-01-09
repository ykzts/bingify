import { youtube_v3 } from "@googleapis/youtube";
import { OAuth2Client } from "google-auth-library";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  YouTubeChannelInsert,
  YouTubeChannelMetadata,
} from "@/lib/types/social-metadata";
import type { Database } from "@/types/supabase";

/**
 * OAuthアクセストークンからOAuth2Clientを作成する
 */
function createOAuth2ClientFromToken(accessToken: string): OAuth2Client {
  const oauth2Client = new OAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });
  return oauth2Client;
}

/**
 * YouTube Data API v3からチャンネルの詳細情報を取得
 */
async function fetchYouTubeChannelDetails(
  channelId: string,
  accessToken: string
): Promise<YouTubeChannelInsert> {
  const oauth2Client = createOAuth2ClientFromToken(accessToken);
  const youtube = new youtube_v3.Youtube({
    auth: oauth2Client,
  });

  const response = await youtube.channels.list({
    id: [channelId],
    part: ["snippet"],
  });

  if (!response.data.items || response.data.items.length === 0) {
    throw new Error("Channel not found");
  }

  const channel = response.data.items[0];
  const snippet = channel.snippet;

  return {
    channel_id: channelId,
    channel_title: snippet?.title || null,
    custom_url: snippet?.customUrl || null,
    description: snippet?.description || null,
    fetched_at: new Date().toISOString(),
    handle: snippet?.customUrl ? `@${snippet.customUrl}` : null,
    thumbnail_url: snippet?.thumbnails?.default?.url || null,
  };
}

/**
 * データベースからYouTubeチャンネルメタデータを取得
 */
export async function getYouTubeChannelMetadata(
  supabase: SupabaseClient<Database>,
  channelId: string
): Promise<YouTubeChannelMetadata | null> {
  const { data, error } = await supabase
    .from("youtube_channels")
    .select("*")
    .eq("channel_id", channelId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as YouTubeChannelMetadata;
}

/**
 * YouTubeチャンネルメタデータをデータベースに保存またはUPSERT
 */
export async function upsertYouTubeChannelMetadata(
  supabase: SupabaseClient<Database>,
  metadata: YouTubeChannelInsert
): Promise<YouTubeChannelMetadata> {
  const { data, error } = await supabase
    .from("youtube_channels")
    .upsert(
      {
        ...metadata,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "channel_id",
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert YouTube channel metadata: ${error.message}`);
  }

  return data as unknown as YouTubeChannelMetadata;
}

/**
 * YouTubeチャンネルメタデータを取得し、キャッシュする
 * - DBにデータがあり、かつ新しい（24時間以内）場合はDBから返す
 * - それ以外の場合はAPIから取得してDBに保存
 */
export async function fetchAndCacheYouTubeChannelMetadata(
  supabase: SupabaseClient<Database>,
  channelId: string,
  accessToken: string,
  userId?: string
): Promise<YouTubeChannelMetadata> {
  // まずDBをチェック
  const cached = await getYouTubeChannelMetadata(supabase, channelId);

  // キャッシュがあり、24時間以内のものであればそれを返す
  if (cached && !cached.fetch_error) {
    const fetchedAt = new Date(cached.fetched_at);
    const now = new Date();
    const ageInHours = (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60);

    if (ageInHours < 24) {
      return cached;
    }
  }

  // APIから取得
  try {
    const metadata = await fetchYouTubeChannelDetails(channelId, accessToken);

    // created_byを設定
    if (userId) {
      metadata.created_by = userId;
    }

    // DBに保存
    return await upsertYouTubeChannelMetadata(supabase, metadata);
  } catch (error) {
    // エラーが発生した場合は、エラー情報を保存
    const errorMetadata: YouTubeChannelInsert = {
      channel_id: channelId,
      fetch_error: error instanceof Error ? error.message : "Unknown error",
      fetched_at: new Date().toISOString(),
    };

    if (userId) {
      errorMetadata.created_by = userId;
    }

    await upsertYouTubeChannelMetadata(supabase, errorMetadata);

    // キャッシュされたデータがあればそれを返す（古くてもエラーより良い）
    if (cached) {
      return cached;
    }

    throw error;
  }
}

/**
 * YouTubeチャンネルメタデータを表示用の文字列に変換
 */
export function formatYouTubeChannelDisplay(
  metadata: YouTubeChannelMetadata
): string {
  const handle = metadata.handle || "";
  const channelId = metadata.channel_id;

  if (handle) {
    return `${handle} (${channelId})`;
  }

  const title = metadata.channel_title || "";
  if (title) {
    return `${title} (${channelId})`;
  }

  return channelId;
}
