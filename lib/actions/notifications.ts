"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/types/notification";

/**
 * 通知取得結果の型
 */
export interface GetNotificationsResult {
  data?: {
    hasMore: boolean;
    notifications: Notification[];
  };
  error?: string;
  success: boolean;
}

/**
 * 未読通知数取得結果の型
 */
export interface GetUnreadCountResult {
  data?: {
    count: number;
  };
  error?: string;
  success: boolean;
}

/**
 * 通知操作結果の型
 */
export interface NotificationActionResult {
  error?: string;
  success: boolean;
}

/**
 * ページネーション機能付きで通知を取得する
 *
 * @param page - ページ番号 (1から開始)
 * @param perPage - 1ページあたりの通知数
 * @param unreadOnly - 未読通知のみを取得するか
 * @returns 通知一覧とページング情報
 */
export async function getNotifications(
  page = 1,
  perPage = 20,
  unreadOnly = false
): Promise<GetNotificationsResult> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: "認証が必要です",
        success: false,
      };
    }

    // ページング計算（Supabaseのrangeは両端を含む）
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    // クエリ構築
    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    // 未読のみフィルター
    if (unreadOnly) {
      query = query.eq("read", false);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error("Error fetching notifications:", error);
      return {
        error: "通知の取得に失敗しました",
        success: false,
      };
    }

    // 次のページがあるかチェック
    const hasMore = count ? from + perPage < count : false;

    return {
      data: {
        hasMore,
        notifications: notifications || [],
      },
      success: true,
    };
  } catch (error) {
    console.error("Error in getNotifications:", error);
    return {
      error: "エラーが発生しました",
      success: false,
    };
  }
}

/**
 * 未読通知数を取得する
 *
 * @returns 未読通知の数
 */
export async function getUnreadCount(): Promise<GetUnreadCountResult> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: "認証が必要です",
        success: false,
      };
    }

    // 未読通知数をカウント
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) {
      console.error("Error counting unread notifications:", error);
      return {
        error: "未読通知数の取得に失敗しました",
        success: false,
      };
    }

    return {
      data: {
        count: count || 0,
      },
      success: true,
    };
  } catch (error) {
    console.error("Error in getUnreadCount:", error);
    return {
      error: "エラーが発生しました",
      success: false,
    };
  }
}

/**
 * 通知を既読にする
 *
 * @param notificationId - 既読にする通知のID
 * @returns 操作結果
 */
export async function markNotificationRead(
  notificationId: string
): Promise<NotificationActionResult> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: "認証が必要です",
        success: false,
      };
    }

    // 所有権確認
    const { data: notification, error: fetchError } = await supabase
      .from("notifications")
      .select("user_id")
      .eq("id", notificationId)
      .single();

    if (fetchError || !notification) {
      return {
        error: "通知が見つかりません",
        success: false,
      };
    }

    if (notification.user_id !== user.id) {
      return {
        error: "この通知にアクセスする権限がありません",
        success: false,
      };
    }

    // 既読に更新
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error marking notification as read:", updateError);
      return {
        error: "通知の既読化に失敗しました",
        success: false,
      };
    }

    // キャッシュ再検証
    revalidatePath("/[locale]/dashboard", "page");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in markNotificationRead:", error);
    return {
      error: "エラーが発生しました",
      success: false,
    };
  }
}

/**
 * すべての通知を既読にする
 *
 * @returns 操作結果
 */
export async function markAllNotificationsRead(): Promise<NotificationActionResult> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: "認証が必要です",
        success: false,
      };
    }

    // すべての通知を既読に更新
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (updateError) {
      console.error("Error marking all notifications as read:", updateError);
      return {
        error: "すべての通知の既読化に失敗しました",
        success: false,
      };
    }

    // キャッシュ再検証
    revalidatePath("/[locale]/dashboard", "page");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in markAllNotificationsRead:", error);
    return {
      error: "エラーが発生しました",
      success: false,
    };
  }
}

/**
 * 通知を削除する
 *
 * @param notificationId - 削除する通知のID
 * @returns 操作結果
 */
export async function deleteNotification(
  notificationId: string
): Promise<NotificationActionResult> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: "認証が必要です",
        success: false,
      };
    }

    // 所有権確認
    const { data: notification, error: fetchError } = await supabase
      .from("notifications")
      .select("user_id")
      .eq("id", notificationId)
      .single();

    if (fetchError || !notification) {
      return {
        error: "通知が見つかりません",
        success: false,
      };
    }

    if (notification.user_id !== user.id) {
      return {
        error: "この通知を削除する権限がありません",
        success: false,
      };
    }

    // 通知を削除
    const { error: deleteError } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting notification:", deleteError);
      return {
        error: "通知の削除に失敗しました",
        success: false,
      };
    }

    // キャッシュ再検証
    revalidatePath("/[locale]/dashboard", "page");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in deleteNotification:", error);
    return {
      error: "エラーが発生しました",
      success: false,
    };
  }
}
