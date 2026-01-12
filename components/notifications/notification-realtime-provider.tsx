"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface NotificationRealtimeProviderProps {
  children: ReactNode;
  userId: string;
}

/**
 * Supabase Realtimeを使用して通知のリアルタイム更新を処理するProvider
 *
 * @param props - Providerのプロパティ
 * @param props.children - 子要素
 * @param props.userId - 現在のユーザーID
 *
 * @example
 * ```tsx
 * <NotificationRealtimeProvider userId={user.id}>
 *   <NotificationList />
 * </NotificationRealtimeProvider>
 * ```
 */
export function NotificationRealtimeProvider({
  children,
  userId,
}: NotificationRealtimeProviderProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    // Realtimeチャネルを作成し、通知テーブルの変更をリッスン
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `user_id=eq.${userId}`,
          schema: "public",
          table: "notifications",
        },
        () => {
          // 通知関連のキャッシュを無効化
          queryClient.invalidateQueries({
            queryKey: ["notifications"],
          });
        }
      )
      .subscribe();

    // クリーンアップ: コンポーネントのアンマウント時にサブスクリプションを解除
    return () => {
      channel.unsubscribe();
    };
  }, [userId, queryClient]);

  return <>{children}</>;
}
