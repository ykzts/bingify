"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/utils/uuid";

interface AvatarAdminActionResult {
  error?: string;
  success: boolean;
}

/**
 * 管理者権限の検証
 */
async function verifyAdminRole(): Promise<{
  isAdmin: boolean;
  userId?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    isAdmin: profile?.role === "admin",
    userId: user.id,
  };
}

/**
 * カスタムアップロード画像を削除
 * @param userId - 対象ユーザーID
 */
export async function deleteCustomAvatar(
  userId: string
): Promise<AvatarAdminActionResult> {
  try {
    // UUID検証
    if (!isValidUUID(userId)) {
      return {
        error: "errorInvalidUuid",
        success: false,
      };
    }

    // 管理者権限を確認
    const { isAdmin } = await verifyAdminRole();
    if (!isAdmin) {
      return {
        error: "errorNoPermission",
        success: false,
      };
    }

    const adminClient = createAdminClient();

    // ユーザーのプロファイル情報を取得
    const { data: profile, error: fetchError } = await adminClient
      .from("profiles")
      .select("avatar_source, avatar_url")
      .eq("id", userId)
      .single();

    if (fetchError || !profile) {
      console.error("Failed to fetch user profile:", fetchError);
      return {
        error: "errorUserNotFound",
        success: false,
      };
    }

    // avatar_source が 'upload' の場合のみ削除処理を実行
    if (profile.avatar_source !== "upload") {
      return {
        error: "errorNoUploadedAvatar",
        success: false,
      };
    }

    // Supabase Storage からファイルを削除
    if (profile.avatar_url) {
      // URLからファイルパスを抽出
      const storagePathPattern = "/storage/v1/object/public/avatars/";
      let fileName = profile.avatar_url;
      if (profile.avatar_url.includes(storagePathPattern)) {
        const parts = profile.avatar_url.split(storagePathPattern);
        fileName = parts[1] || profile.avatar_url;
      }

      // ストレージから削除（管理者権限で実行）
      const { error: deleteError } = await adminClient.storage
        .from("avatars")
        .remove([fileName]);

      if (deleteError) {
        console.error("Failed to delete avatar from storage:", deleteError);
        // ストレージ削除失敗はログのみ（処理は継続）
      }
    }

    // profiles テーブルを更新
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        avatar_source: "default",
        avatar_url: null,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to update profile:", updateError);
      return {
        error: "errorUpdateFailed",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in deleteCustomAvatar:", error);
    return {
      error: "errorGeneric",
      success: false,
    };
  }
}

/**
 * アバターをデフォルトに戻す
 * @param userId - 対象ユーザーID
 */
export async function resetAvatarToDefault(
  userId: string
): Promise<AvatarAdminActionResult> {
  try {
    // UUID検証
    if (!isValidUUID(userId)) {
      return {
        error: "errorInvalidUuid",
        success: false,
      };
    }

    // 管理者権限を確認
    const { isAdmin } = await verifyAdminRole();
    if (!isAdmin) {
      return {
        error: "errorNoPermission",
        success: false,
      };
    }

    const adminClient = createAdminClient();

    // profiles テーブルを更新
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        avatar_source: "default",
        avatar_url: null,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to update profile:", updateError);
      return {
        error: "errorUpdateFailed",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in resetAvatarToDefault:", error);
    return {
      error: "errorGeneric",
      success: false,
    };
  }
}
