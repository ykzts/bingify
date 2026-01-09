import type { OAuthProvider } from "@/lib/oauth/token-storage";
import { createClient } from "@/lib/supabase/server";

/**
 * アバターのソース種別
 */
export type AvatarSource = OAuthProvider | "upload" | "default";

/**
 * 利用可能なアバター情報
 */
export interface AvailableAvatar {
  avatar_url: string;
  provider: OAuthProvider;
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
    const supabase = await createClient();

    // 認証チェック: 呼び出し元が自分のアバターを変更しているか確認
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized", success: false };
    }

    if (user.id !== userId) {
      return { error: "Unauthorized", success: false };
    }

    // 選択されたソースがプロバイダーの場合、identityからアバターURLを取得
    let avatarUrl: string | null = null;

    if (source !== "default" && source !== "upload") {
      const identity = user.identities?.find((id) => id.provider === source);

      if (!identity) {
        return { error: "Provider identity not found", success: false };
      }

      // identity_data から avatar_url を取得
      avatarUrl =
        (identity.identity_data?.avatar_url as string | undefined) ||
        (identity.identity_data?.picture as string | undefined) ||
        null;
    }

    // profiles テーブルを更新
    const { error: updateError } = await supabase
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
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return { data: null, error: "Unauthorized" };
    }

    // identities から利用可能なアバターを取得
    const availableAvatars: AvailableAvatar[] = [];

    for (const identity of user.identities || []) {
      // 現在サポートしているプロバイダーのみ追加
      if (identity.provider === "google" || identity.provider === "twitch") {
        const avatarUrl =
          (identity.identity_data?.avatar_url as string | undefined) ||
          (identity.identity_data?.picture as string | undefined);

        if (avatarUrl) {
          availableAvatars.push({
            avatar_url: avatarUrl,
            provider: identity.provider as OAuthProvider,
          });
        }
      }
    }

    return { data: availableAvatars, error: null };
  } catch (error) {
    console.error("Error in getAvailableAvatars:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
