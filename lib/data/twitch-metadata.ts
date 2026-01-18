import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiClient } from "@twurple/api";
import { StaticAuthProvider } from "@twurple/auth";
import { getTwitchCredentials } from "@/lib/oauth-credentials";
import { shouldRefreshMetadata } from "@/lib/types/social-metadata";
import type { Database, Tables, TablesInsert } from "@/types/supabase";

/**
 * Twurple API clientを作成
 */
async function createApiClient(userAccessToken: string): Promise<ApiClient> {
  const credentials = await getTwitchCredentials();
  if (!credentials.clientId) {
    throw new Error("Twitch client ID not configured");
  }

  const authProvider = new StaticAuthProvider(
    credentials.clientId,
    userAccessToken
  );
  return new ApiClient({ authProvider });
}

/**
 * Twitch APIからブロードキャスターの詳細情報を取得
 */
async function fetchTwitchBroadcasterDetails(
  broadcasterId: string,
  userAccessToken: string
): Promise<TablesInsert<"twitch_broadcasters">> {
  const apiClient = await createApiClient(userAccessToken);
  // ユーザーアクセストークンで動作するようgetUsersByIdsを使用
  const users = await apiClient.users.getUsersByIds([broadcasterId]);

  if (users.length === 0) {
    throw new Error("Broadcaster not found");
  }

  const user = users[0];

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
): Promise<Tables<"twitch_broadcasters"> | null> {
  const { data, error } = await supabase
    .from("twitch_broadcasters")
    .select("*")
    .eq("broadcaster_id", broadcasterId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Twitchブロードキャスターメタデータをデータベースに保存またはUPSERT
 */
export async function upsertTwitchBroadcasterMetadata(
  supabase: SupabaseClient<Database>,
  metadata: TablesInsert<"twitch_broadcasters">
): Promise<Tables<"twitch_broadcasters">> {
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

  return data;
}

/**
 * Twitchブロードキャスターメタデータを取得し、キャッシュする
 * - DBにデータがあり、かつ新しい（24時間以内）場合はDBから返す
 * - それ以外の場合はAPIから取得してDBに保存
 */
export async function fetchAndCacheTwitchBroadcasterMetadata(
  supabase: SupabaseClient<Database>,
  broadcasterId: string,
  userAccessToken: string,
  userId?: string
): Promise<Tables<"twitch_broadcasters">> {
  // まずDBをチェック
  const cached = await getTwitchBroadcasterMetadata(supabase, broadcasterId);

  // キャッシュがあり、エラーがなく、24時間以内のものであればそれを返す
  if (
    cached &&
    !cached.fetch_error &&
    !shouldRefreshMetadata(cached.fetched_at)
  ) {
    return cached;
  }

  // APIから取得
  try {
    const metadata = await fetchTwitchBroadcasterDetails(
      broadcasterId,
      userAccessToken
    );

    // created_byを設定
    if (userId) {
      metadata.created_by = userId;
    }

    // DBに保存
    return await upsertTwitchBroadcasterMetadata(supabase, metadata);
  } catch (error) {
    // エラーが発生した場合は、fetch_errorとfetched_atのみ更新
    if (cached) {
      const fetch_error =
        error instanceof Error ? error.message : "Unknown error";
      const fetched_at = new Date().toISOString();

      // TOCTOU回避: fetch_errorとfetched_atのみ更新
      const { error: updateError } = await supabase
        .from("twitch_broadcasters")
        .update({
          fetch_error,
          fetched_at,
          updated_at: new Date().toISOString(),
        })
        .eq("broadcaster_id", broadcasterId);

      if (updateError) {
        console.error("Failed to update error metadata:", updateError);
      }

      // cachedにエラー情報を反映して返す
      return {
        ...cached,
        fetch_error,
        fetched_at,
      };
    }

    // 既存レコードがない場合のみ、新規にエラーレコードを作成
    const errorMetadata: TablesInsert<"twitch_broadcasters"> = {
      broadcaster_id: broadcasterId,
      fetch_error: error instanceof Error ? error.message : "Unknown error",
      fetched_at: new Date().toISOString(),
    };

    if (userId) {
      errorMetadata.created_by = userId;
    }

    await upsertTwitchBroadcasterMetadata(supabase, errorMetadata);

    throw error;
  }
}

/**
 * Twitchブロードキャスターメタデータを表示用の文字列に変換
 */
export function formatTwitchBroadcasterDisplay(
  metadata: Tables<"twitch_broadcasters">
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
