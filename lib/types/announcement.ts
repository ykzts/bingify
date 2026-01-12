import type { Tables } from "@/types/supabase";

/**
 * アナウンスメントの優先度レベル
 */
export type AnnouncementPriority = "info" | "warning" | "error";

/**
 * アナウンスメント型
 * グローバルまたはスペース固有のアナウンスメントを表します
 */
export interface Announcement
  extends Omit<Tables<"announcements">, "priority"> {
  /**
   * アナウンスメントの優先度レベル
   * - info: 情報（青色）
   * - warning: 重要（黄色）
   * - error: 緊急（赤色）
   */
  priority: AnnouncementPriority;
}

/**
 * アナウンスメント非表示記録型
 * ユーザーがアナウンスメントを非表示にした記録を表します
 */
export type AnnouncementDismissal = Tables<"announcement_dismissals">;

/**
 * スペース限定アナウンスメント型
 * アナウンスメントとスペースの関連付けを表します
 */
export type SpaceAnnouncement = Tables<"space_announcements">;
