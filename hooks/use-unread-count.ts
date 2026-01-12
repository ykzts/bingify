"use client";

import { useQuery } from "@tanstack/react-query";
import { getUnreadCount } from "@/lib/actions/notifications";

/**
 * 未読通知数取得結果の型
 */
export interface UseUnreadCountResult {
  /** 未読通知数 */
  count: number;
  /** エラー */
  error: Error | null;
  /** 取得エラーメッセージ */
  fetchError?: string;
  /** ローディング状態 */
  isLoading: boolean;
}

/**
 * 未読通知数を取得するReact Queryフック
 *
 * @returns 未読通知数とローディング/エラー状態
 *
 * @example
 * ```tsx
 * const { count, isLoading, error } = useUnreadCount();
 *
 * if (isLoading) return <span>...</span>;
 * if (error) return <span>!</span>;
 *
 * return <span>{count > 0 && count}</span>;
 * ```
 */
export function useUnreadCount(): UseUnreadCountResult {
  const query = useQuery({
    queryFn: async () => {
      const result = await getUnreadCount();

      // エラーハンドリング
      if (!result.success) {
        throw new Error(result.error || "未読通知数の取得に失敗しました");
      }

      return result.data;
    },
    queryKey: ["notifications", "unread-count"],
    refetchInterval: 30 * 1000, // 30秒ごとに再取得
  });

  return {
    count: query.data?.count ?? 0,
    error: query.error,
    fetchError: query.error?.message,
    isLoading: query.isLoading,
  };
}
