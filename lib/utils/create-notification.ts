import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationTypeValue } from "@/lib/types/notification";
import type { Json } from "@/types/supabase";
import { getErrorMessage } from "./error-message";

/**
 * 通知作成結果の型
 */
export interface CreateNotificationResult {
  /** エラーメッセージ（成功時は undefined） */
  error?: string;
  /** 作成された通知のID（失敗時は undefined） */
  notificationId?: string;
  /** 処理の成功/失敗 */
  success: boolean;
}

/**
 * 通知メタデータの型
 */
export interface NotificationMetadata {
  /** カスタムアクションURL */
  action_url?: string;
  /** アナウンスメントID */
  announcement_id?: string;
  /** 送信者のユーザーID */
  sender_id?: string;
  /** スペースID */
  space_id?: string;
  /** その他のメタデータ */
  [key: string]: unknown;
}

/**
 * ユーザー向けの通知を作成します
 *
 * この関数は管理者権限を持つSupabaseクライアントを使用して
 * 通知テーブルにレコードを挿入します。
 * 通知は作成から30日後に自動的に期限切れとなります。
 *
 * @param userId - 通知を受け取るユーザーのID
 * @param type - 通知タイプ（例: 'space_invitation', 'bingo_achieved'）
 * @param title - 通知のタイトル（最大200文字）
 * @param content - 通知の内容（最大1000文字）
 * @param linkUrl - オプションの外部リンクURL（metadata.action_urlとして保存）
 * @param metadata - オプションの追加メタデータ
 * @returns 処理結果（success, error?, notificationId?）
 *
 * @example
 * ```typescript
 * const result = await createNotification(
 *   userId,
 *   'space_invitation',
 *   'スペースへの招待',
 *   '新しいスペースに招待されました',
 *   'https://example.com/spaces/abc123',
 *   { space_id: 'abc123', sender_id: 'xyz789' }
 * );
 *
 * if (result.success) {
 *   console.log('通知作成成功:', result.notificationId);
 * } else {
 *   console.error('通知作成失敗:', result.error);
 * }
 * ```
 */
export async function createNotification(
  userId: string,
  type: NotificationTypeValue,
  title: string,
  content: string,
  linkUrl?: string,
  metadata: NotificationMetadata = {}
): Promise<CreateNotificationResult> {
  try {
    const adminClient = createAdminClient();

    // 30日後の有効期限を計算
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // linkUrlが指定されている場合はmetadataに追加
    const finalMetadata: NotificationMetadata = {
      ...metadata,
    };

    if (linkUrl) {
      finalMetadata.action_url = linkUrl;
    }

    const { data, error } = await adminClient
      .from("notifications")
      .insert({
        content,
        expires_at: expiresAt.toISOString(),
        metadata: finalMetadata as Json,
        title,
        type,
        user_id: userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("通知作成エラー:", error);
      return {
        error: getErrorMessage(error),
        success: false,
      };
    }

    return {
      notificationId: data.id,
      success: true,
    };
  } catch (error) {
    console.error("通知作成の予期しないエラー:", error);
    return {
      error: getErrorMessage(error),
      success: false,
    };
  }
}
