import { createAdminClient } from "@/lib/supabase/admin";

/**
 * アバターのソース種別
 */
export type AvatarSource =
  | "google"
  | "twitch"
  | "github"
  | "discord"
  | "upload"
  | "default";

/**
 * プロバイダーアバター情報
 */
export interface ProviderAvatar {
  avatar_url: string;
  created_at: string;
  id: string;
  provider: AvatarSource;
  updated_at: string;
  user_id: string;
}

/**
 * 利用可能なアバター情報
 */
export interface AvailableAvatar {
  avatar_url: string;
  provider: AvatarSource;
}

/**
 * プロバイダーアバターを更新または挿入
 * @param userId - ユーザーID
 * @param provider - プロバイダー名
 * @param avatarUrl - アバターURL
 */
export async function updateProviderAvatar(
  userId: string,
  provider: AvatarSource,
  avatarUrl: string
): Promise<{ error: string | null; success: boolean }> {
  try {
    const adminClient = createAdminClient();

    const { error } = await adminClient.from("user_provider_avatars").upsert(
      {
        avatar_url: avatarUrl,
        provider,
        user_id: userId,
      },
      {
        onConflict: "user_id,provider",
      }
    );

    if (error) {
      console.error("Error updating provider avatar:", error);
      return { error: error.message, success: false };
    }

    return { error: null, success: true };
  } catch (error) {
    console.error("Error in updateProviderAvatar:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      success: false,
    };
  }
}

/**
 * アクティブなアバターソースを変更
 * @param userId - ユーザーID
 * @param source - 新しいアバターソース
 */
export async function setActiveAvatar(
  userId: string,
  source: AvatarSource
): Promise<{ error: string | null; success: boolean }> {
  try {
    const adminClient = createAdminClient();

    // 選択されたソースがプロバイダーの場合、対応するアバターURLを取得
    let avatarUrl: string | null = null;

    if (source !== "default" && source !== "upload") {
      const { data: providerAvatar, error: fetchError } = await adminClient
        .from("user_provider_avatars")
        .select("avatar_url")
        .eq("user_id", userId)
        .eq("provider", source)
        .single();

      if (fetchError) {
        console.error("Error fetching provider avatar:", fetchError);
        return { error: "Provider avatar not found", success: false };
      }

      avatarUrl = providerAvatar.avatar_url;
    }

    // profiles テーブルを更新
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        avatar_source: source,
        avatar_url: avatarUrl,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating profile avatar:", updateError);
      return { error: updateError.message, success: false };
    }

    return { error: null, success: true };
  } catch (error) {
    console.error("Error in setActiveAvatar:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      success: false,
    };
  }
}

/**
 * ユーザーが利用可能なアバター一覧を取得
 * @param userId - ユーザーID
 */
export async function getAvailableAvatars(
  userId: string
): Promise<{ data: AvailableAvatar[] | null; error: string | null }> {
  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("user_provider_avatars")
      .select("provider, avatar_url")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching available avatars:", error);
      return { data: null, error: error.message };
    }

    // 型を明示的にキャスト
    const typedData = (data || []).map((item) => ({
      avatar_url: item.avatar_url,
      provider: item.provider as AvatarSource,
    }));

    return { data: typedData, error: null };
  } catch (error) {
    console.error("Error in getAvailableAvatars:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
