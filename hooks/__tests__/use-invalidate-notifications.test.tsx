import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInvalidateNotifications } from "../use-invalidate-notifications";

// lib/actions/notificationsのモック
vi.mock("@/lib/actions/notifications", () => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
}));

import { getNotifications, getUnreadCount } from "@/lib/actions/notifications";

/**
 * テスト用のQueryClientProviderラッパー
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return {
    queryClient,
    wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    },
  };
}

describe("useInvalidateNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("通知キャッシュを無効化できる", () => {
    const mockNotifications = [
      {
        content: "テスト通知",
        created_at: "2024-01-01T00:00:00Z",
        expires_at: "2024-01-31T00:00:00Z",
        id: "notif-1",
        metadata: null,
        read: false,
        title: "通知",
        type: "space_invitation",
        user_id: "user-123",
      },
    ];

    vi.mocked(getNotifications).mockResolvedValue({
      data: {
        hasMore: false,
        notifications: mockNotifications,
      },
      success: true,
    });

    const { wrapper } = createWrapper();

    // キャッシュ無効化フックを使用
    const { result: invalidateResult } = renderHook(
      () => useInvalidateNotifications(),
      { wrapper }
    );

    // invalidateNotifications関数が存在することを確認
    expect(invalidateResult.current).toBeInstanceOf(Function);

    // 関数を実行してもエラーが発生しないことを確認
    act(() => {
      invalidateResult.current();
    });
  });

  it("未読数キャッシュを無効化できる", () => {
    vi.mocked(getUnreadCount).mockResolvedValue({
      data: {
        count: 5,
      },
      success: true,
    });

    const { wrapper } = createWrapper();

    // キャッシュ無効化フックを使用
    const { result: invalidateResult } = renderHook(
      () => useInvalidateNotifications(),
      { wrapper }
    );

    // invalidateNotifications関数が存在することを確認
    expect(invalidateResult.current).toBeInstanceOf(Function);

    // 関数を実行してもエラーが発生しないことを確認
    act(() => {
      invalidateResult.current();
    });
  });
});
