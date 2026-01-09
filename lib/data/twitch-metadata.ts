import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiClient } from "@twurple/api";
import { StaticAuthProvider } from "@twurple/auth";
import type {
  TwitchBroadcasterInsert,
  TwitchBroadcasterMetadata,
} from "@/lib/types/social-metadata";
import type { Database } from "@/types/supabase";

/**
 * Twurple API clientを作成
 */
function createApiClient(appAccessToken: string): ApiClient {
  const clientId = process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID;
  if (!clientId) {
    throw new Error("Twitch client ID not configured");
  }

  const authProvider = new StaticAuthProvider(clientId, appAccessToken);
  return new ApiClient({ authProvider });
}

/**
 * Twitch APIからブロードキャスターの詳細情報を取得
 */
async function fetchTwitchBroadcasterDetails(
  broadcasterId: string,
  appAccessToken: string
): Promise<TwitchBroadcasterInsert> {
  const apiClient = createApiClient(appAccessToken);
  const user = await apiClient.users.getUserById(broadcasterId);

  if (!user) {
    throw new Error("Broadcaster not found");
  }

  return {
    broadcaster_id: broadcasterId,
    description: user.description || null,
    display_name: user.displayName,
    fetched_at: new Date().toISOString(),
    profile_image_url: user.profilePictureUrl,
    username: user.name,
  };
}

/**
 * データベースからTwitchブロードキャスターメタデータを取得
 */
export async function getTwitchBroadcasterMetadata(
  supabase: SupabaseClient<Database>,
  broadcasterId: string
): Promise<TwitchBroadcasterMetadata | null> {
  const { data, error } = await supabase
    .from("twitch_broadcasters")
    .select("*")
    .eq("broadcaster_id", broadcasterId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as TwitchBroadcasterMetadata;
}

/**
 * Twitchブロードキャスターメタデータをデータベースに保存またはUPSERT
 */
export async function upsertTwitchBroadcasterMetadata(
  supabase: SupabaseClient<Database>,
  metadata: TwitchBroadcasterInsert
): Promise<TwitchBroadcasterMetadata> {
  const { data, error } = await supabase
    .from("twitch_broadcasters")
    .upsert(
      {
        ...metadata,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "broadcaster_id",
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(
      `Failed to upsert Twitch broadcaster metadata: ${error.message}`
    );
  }

  return data as unknown as TwitchBroadcasterMetadata;
}

/**
 * Twitchブロードキャスターメタデータを取得し、キャッシュする
 * - DBにデータがあり、かつ新しい（24時間以内）場合はDBから返す
 * - それ以外の場合はAPIから取得してDBに保存
 */
export async function fetchAndCacheTwitchBroadcasterMetadata(
  supabase: SupabaseClient<Database>,
  broadcasterId: string,
  appAccessToken: string,
  userId?: string
): Promise<TwitchBroadcasterMetadata> {
  // まずDBをチェック
  const cached = await getTwitchBroadcasterMetadata(supabase, broadcasterId);

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
    const metadata = await fetchTwitchBroadcasterDetails(
      broadcasterId,
      appAccessToken
    );

    // created_byを設定
    if (userId) {
      metadata.created_by = userId;
    }

    // DBに保存
    return await upsertTwitchBroadcasterMetadata(supabase, metadata);
  } catch (error) {
    // エラーが発生した場合は、エラー情報を保存
    const errorMetadata: TwitchBroadcasterInsert = {
      broadcaster_id: broadcasterId,
      fetch_error: error instanceof Error ? error.message : "Unknown error",
      fetched_at: new Date().toISOString(),
    };

    if (userId) {
      errorMetadata.created_by = userId;
    }

    await upsertTwitchBroadcasterMetadata(supabase, errorMetadata);

    // キャッシュされたデータがあればそれを返す（古くてもエラーより良い）
    if (cached) {
      return cached;
    }

    throw error;
  }
}

/**
 * Twitchブロードキャスターメタデータを表示用の文字列に変換
 */
export function formatTwitchBroadcasterDisplay(
  metadata: TwitchBroadcasterMetadata
): string {
  const username = metadata.username || "";
  const broadcasterId = metadata.broadcaster_id;

  if (username) {
    return `${username} (${broadcasterId})`;
  }

  const displayName = metadata.display_name || "";
  if (displayName) {
    return `${displayName} (${broadcasterId})`;
  }

  return broadcasterId;
}
