import {
  AVATAR_MAX_FILE_SIZE,
  AVATAR_MIME_TYPE_TO_EXT,
  AVATAR_MIN_FILE_SIZE,
  isValidAvatarMimeType,
} from "@/lib/constants/avatar";
import { createClient } from "./server";

const AVATARS_BUCKET = "avatars";

/**
 * アバター画像をSupabase Storageにアップロード
 * @param userId - ユーザーID
 * @param file - アップロードするファイル
 * @returns アップロードされた画像の公開URL
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ data: string | null; error: string | null }> {
  try {
    // ファイルサイズチェック（最小）
    if (file.size < AVATAR_MIN_FILE_SIZE) {
      return {
        data: null,
        error: "File must not be empty",
      };
    }

    // ファイルサイズチェック（最大）
    if (file.size > AVATAR_MAX_FILE_SIZE) {
      return {
        data: null,
        error: "File size exceeds 2MB limit",
      };
    }

    // MIMEタイプチェック
    if (!isValidAvatarMimeType(file.type)) {
      return {
        data: null,
        error: "Invalid file type. Only JPEG, PNG, and WebP are allowed",
      };
    }

    const supabase = await createClient();

    // ファイル名を生成: {userId}/{timestamp}.{ext}
    // セキュリティのため、MIMEタイプから拡張子を決定
    const timestamp = Date.now();
    const ext = AVATAR_MIME_TYPE_TO_EXT[file.type] || "jpg";
    const fileName = `${userId}/${timestamp}.${ext}`;

    // ファイルをArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer();

    // Supabase Storageにアップロード
    const { error: uploadError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading avatar:", uploadError);
      return {
        data: null,
        error: uploadError.message,
      };
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from(AVATARS_BUCKET)
      .getPublicUrl(fileName);

    return {
      data: urlData.publicUrl,
      error: null,
    };
  } catch (error) {
    console.error("Error in uploadAvatar:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 古いアバター画像を削除
 * @param userId - ユーザーID
 * @param path - 削除するファイルのパス（公開URLまたはストレージパス）
 */
export async function deleteAvatar(
  userId: string,
  path: string
): Promise<{ error: string | null; success: boolean }> {
  try {
    const supabase = await createClient();

    // パスから実際のファイル名を抽出
    // 公開URLの場合: https://.../storage/v1/object/public/avatars/{userId}/{timestamp}.{ext}
    // ストレージパスの場合: {userId}/{timestamp}.{ext}
    let fileName = path;
    const storagePathPattern = "/storage/v1/object/public/avatars/";
    if (path.includes(storagePathPattern)) {
      const parts = path.split(storagePathPattern);
      fileName = parts[1] || path;
    }

    // ユーザーIDで始まるパスかチェック（セキュリティ）
    if (!fileName.startsWith(userId)) {
      return {
        error: "Unauthorized: Cannot delete files from other users",
        success: false,
      };
    }

    const { error: deleteError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .remove([fileName]);

    if (deleteError) {
      console.error("Error deleting avatar:", deleteError);
      return {
        error: deleteError.message,
        success: false,
      };
    }

    return {
      error: null,
      success: true,
    };
  } catch (error) {
    console.error("Error in deleteAvatar:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      success: false,
    };
  }
}

/**
 * ストレージパスから公開URLを生成
 * @param path - ストレージパス
 */
export async function getAvatarPublicUrl(path: string): Promise<string> {
  const supabase = await createClient();
  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
