"use client";

import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "@/lib/actions/notifications";
import type { Notification } from "@/lib/types/notification";

/**
 * 通知取得結果の型
 */
export interface UseNotificationsResult {
  /** 通知データ */
  data?: {
    hasMore: boolean;
    notifications: Notification[];
  };
  /** エラーメッセージ */
  error: Error | null;
  /** 取得エラー */
  fetchError?: string;
  /** 次のページがあるか */
  hasMore: boolean;
  /** ローディング状態 */
  isLoading: boolean;
  /** 通知一覧 */
  notifications: Notification[];
}

/**
 * 通知一覧を取得するReact Queryフック
 *
 * @param page - ページ番号 (1から開始)
 * @param perPage - 1ページあたりの通知数
 * @param unreadOnly - 未読通知のみを取得するか
 * @returns 通知一覧とページング情報
 *
 * @example
 * ```tsx
 * const { notifications, hasMore, isLoading, error } = useNotifications(1, 20, false);
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 *
 * return (
 *   <div>
 *     {notifications.map((notification) => (
 *       <NotificationItem key={notification.id} notification={notification} />
 *     ))}
 *     {hasMore && <button onClick={loadMore}>Load More</button>}
 *   </div>
 * );
 * ```
 */
export function useNotifications(
  page = 1,
  perPage = 20,
  unreadOnly = false
): UseNotificationsResult {
  const query = useQuery({
    queryFn: async () => {
      const result = await getNotifications(page, perPage, unreadOnly);

      // エラーハンドリング
      if (!result.success) {
        throw new Error(result.error || "通知の取得に失敗しました");
      }

      return result.data;
    },
    queryKey: ["notifications", page, perPage, unreadOnly],
    refetchInterval: 60 * 1000, // 60秒ごとに再取得
    staleTime: 30 * 1000, // 30秒間はキャッシュを使用
  });

  return {
    data: query.data,
    error: query.error,
    fetchError: query.error?.message,
    hasMore: query.data?.hasMore ?? false,
    isLoading: query.isLoading,
    notifications: query.data?.notifications ?? [],
  };
}
