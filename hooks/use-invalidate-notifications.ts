"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * 通知関連のキャッシュを無効化するフック
 *
 * @returns キャッシュ無効化用の関数
 *
 * @example
 * ```tsx
 * const invalidateNotifications = useInvalidateNotifications();
 *
 * // 通知を既読にした後
 * await markNotificationRead(id);
 * invalidateNotifications();
 * ```
 */
export function useInvalidateNotifications() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    // すべての通知関連のキャッシュを無効化
    queryClient.invalidateQueries({
      queryKey: ["notifications"],
    });
  }, [queryClient]);
}
