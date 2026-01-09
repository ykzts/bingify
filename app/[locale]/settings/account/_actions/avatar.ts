"use server";

import { revalidatePath } from "next/cache";
import type { AvatarSource } from "@/lib/services/avatar-service";
import { setActiveAvatar } from "@/lib/services/avatar-service";
import { createClient } from "@/lib/supabase/server";

export interface SelectAvatarState {
  error?: string;
  errorKey?: string;
  success: boolean;
}

/**
 * アバターソースを選択するサーバーアクション
 * @param formData - フォームデータ
 */
export async function selectAvatar(
  formData: FormData
): Promise<SelectAvatarState> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        errorKey: "errorUnauthorized",
        success: false,
      };
    }

    // フォームデータからソースを取得
    const source = formData.get("source");
    if (typeof source !== "string") {
      return {
        errorKey: "errorInvalidSource",
        success: false,
      };
    }

    // ソースのバリデーション
    const validSources: AvatarSource[] = [
      "google",
      "twitch",
      "github",
      "discord",
      "upload",
      "default",
    ];
    if (!validSources.includes(source as AvatarSource)) {
      return {
        errorKey: "errorInvalidSource",
        success: false,
      };
    }

    // プロバイダーアバターの場合、存在確認
    if (
      source === "google" ||
      source === "twitch" ||
      source === "github" ||
      source === "discord"
    ) {
      const { data: providerAvatar } = await supabase
        .from("user_provider_avatars")
        .select("id")
        .eq("user_id", user.id)
        .eq("provider", source)
        .single();

      if (!providerAvatar) {
        return {
          errorKey: "errorProviderNotLinked",
          success: false,
        };
      }
    }

    // アバターソースを変更
    const result = await setActiveAvatar(user.id, source as AvatarSource);

    if (!result.success) {
      console.error("Failed to set active avatar:", result.error);
      return {
        errorKey: "errorUpdateFailed",
        success: false,
      };
    }

    // キャッシュを再検証
    revalidatePath("/[locale]/settings/account", "page");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in selectAvatar:", error);
    return {
      errorKey: "errorGeneric",
      success: false,
    };
  }
}
