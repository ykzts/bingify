import type { Tables } from "@/types/supabase";

/**
 * 通知タイプの定数オブジェクト
 */
export const NotificationType = {
  /** アナウンスメント公開 */
  ANNOUNCEMENT_PUBLISHED: "announcement_published",
  /** ビンゴ達成 */
  BINGO_ACHIEVED: "bingo_achieved",
  /** 権限変更 */
  ROLE_CHANGED: "role_changed",
  /** スペースクローズ */
  SPACE_CLOSED: "space_closed",
  /** スペースへの招待 */
  SPACE_INVITATION: "space_invitation",
  /** スペースの更新 */
  SPACE_UPDATED: "space_updated",
  /** システムアップデート */
  SYSTEM_UPDATE: "system_update",
} as const;

/**
 * 通知タイプの型
 */
export type NotificationTypeValue =
  (typeof NotificationType)[keyof typeof NotificationType];

/**
 * 通知型
 * ユーザー向けの通知メッセージを表します（30日間自動削除）
 */
export type Notification = Tables<"notifications">;

/**
 * 通知メタデータの型
 * 通知の追加情報を格納します
 */
export interface NotificationMetadata {
  /** スペースID */
  space_id?: string;
  /** アナウンスメントID */
  announcement_id?: string;
  /** 送信者のユーザーID */
  sender_id?: string;
  /** カスタムアクションURL */
  action_url?: string;
  /** その他のメタデータ */
  [key: string]: unknown;
}
