"use server";

import { revalidatePath } from "next/cache";
import {
  AVATAR_MAX_FILE_SIZE,
  isValidAvatarMimeType,
} from "@/lib/constants/avatar";
import { isValidOAuthProvider } from "@/lib/oauth/provider-validation";
import type { AvatarSource } from "@/lib/services/avatar-service";
import { setActiveAvatar } from "@/lib/services/avatar-service";
import { createClient } from "@/lib/supabase/server";
import { deleteAvatar, uploadAvatar } from "@/lib/supabase/storage";

export interface SelectAvatarState {
  error?: string;
  errorKey?: string;
  success: boolean;
}

export interface UploadAvatarState {
  data?: {
    avatarUrl: string;
  };
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
      "upload",
      "default",
    ];
    if (!validSources.includes(source as AvatarSource)) {
      return {
        errorKey: "errorInvalidSource",
        success: false,
      };
    }

    // プロバイダーアバターの場合、identity が存在するか確認
    if (isValidOAuthProvider(source)) {
      const identities = user.identities || [];
      const hasIdentity = identities.some(
        (identity) => identity.provider === source
      );

      if (!hasIdentity) {
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

/**
 * アバター画像をアップロードするサーバーアクション
 * @param formData - フォームデータ（ファイルを含む）
 */
export async function uploadAvatarAction(
  formData: FormData
): Promise<UploadAvatarState> {
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

    // フォームデータからファイルを取得
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return {
        errorKey: "errorInvalidFile",
        success: false,
      };
    }

    // サーバー側バリデーション
    if (file.size > AVATAR_MAX_FILE_SIZE) {
      return {
        errorKey: "errorFileSizeExceeded",
        success: false,
      };
    }

    if (!isValidAvatarMimeType(file.type)) {
      return {
        errorKey: "errorInvalidFileType",
        success: false,
      };
    }

    // 既存のアップロード画像を取得
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("avatar_url, avatar_source")
      .eq("id", user.id)
      .single();

    const oldAvatarUrl =
      currentProfile?.avatar_source === "upload"
        ? currentProfile.avatar_url
        : null;

    // ファイルをSupabase Storageにアップロード
    const { data: publicUrl, error: uploadError } = await uploadAvatar(
      user.id,
      file
    );

    if (uploadError || !publicUrl) {
      console.error("Failed to upload avatar:", uploadError);
      return {
        errorKey: "errorUploadFailed",
        success: false,
      };
    }

    // profiles テーブルを更新
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_source: "upload",
        avatar_url: publicUrl,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update profile:", updateError);
      // アップロードしたファイルをクリーンアップ
      const cleanupResult = await deleteAvatar(user.id, publicUrl);
      if (!cleanupResult.success) {
        console.error("Failed to cleanup uploaded file:", cleanupResult.error);
      }
      return {
        errorKey: "errorUpdateFailed",
        success: false,
      };
    }

    // 古いアップロード画像があれば削除
    if (oldAvatarUrl) {
      const deleteResult = await deleteAvatar(user.id, oldAvatarUrl);
      if (!deleteResult.success) {
        // 古いファイルの削除失敗はログのみ（処理は継続）
        console.error("Failed to delete old avatar:", deleteResult.error);
      }
    }

    // キャッシュを再検証
    revalidatePath("/[locale]/settings/account", "page");

    return {
      data: {
        avatarUrl: publicUrl,
      },
      success: true,
    };
  } catch (error) {
    console.error("Error in uploadAvatarAction:", error);
    return {
      errorKey: "errorGeneric",
      success: false,
    };
  }
}
