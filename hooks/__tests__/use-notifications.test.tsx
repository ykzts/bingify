import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNotifications } from "../use-notifications";

// lib/actions/notificationsのモック
vi.mock("@/lib/actions/notifications", () => ({
  getNotifications: vi.fn(),
}));

import { getNotifications } from "@/lib/actions/notifications";

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

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("通知一覧を正常に取得できる", async () => {
    const mockNotifications = [
      {
        content: "テスト通知1",
        created_at: "2024-01-01T00:00:00Z",
        expires_at: "2024-01-31T00:00:00Z",
        id: "notif-1",
        metadata: null,
        read: false,
        title: "通知1",
        type: "space_invitation",
        user_id: "user-123",
      },
      {
        content: "テスト通知2",
        created_at: "2024-01-02T00:00:00Z",
        expires_at: "2024-02-01T00:00:00Z",
        id: "notif-2",
        metadata: null,
        read: true,
        title: "通知2",
        type: "bingo_achieved",
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

    const { result } = renderHook(() => useNotifications(1, 20, false), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notifications).toEqual(mockNotifications);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBeNull();
    expect(getNotifications).toHaveBeenCalledWith(1, 20, false);
  });

  it("エラーが発生した場合はエラー状態を返す", async () => {
    const errorMessage = "通知の取得に失敗しました";

    vi.mocked(getNotifications).mockResolvedValue({
      error: errorMessage,
      success: false,
    });

    const { result } = renderHook(() => useNotifications(1, 20, false), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.fetchError).toBe(errorMessage);
    expect(result.current.notifications).toEqual([]);
  });

  it("ページネーションパラメータが正しく渡される", async () => {
    vi.mocked(getNotifications).mockResolvedValue({
      data: {
        hasMore: true,
        notifications: [],
      },
      success: true,
    });

    const { result } = renderHook(() => useNotifications(2, 10, false), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getNotifications).toHaveBeenCalledWith(2, 10, false);
    expect(result.current.hasMore).toBe(true);
  });

  it("未読のみフィルターが正しく動作する", async () => {
    const mockUnreadNotifications = [
      {
        content: "未読通知",
        created_at: "2024-01-01T00:00:00Z",
        expires_at: "2024-01-31T00:00:00Z",
        id: "notif-1",
        metadata: null,
        read: false,
        title: "未読",
        type: "space_invitation",
        user_id: "user-123",
      },
    ];

    vi.mocked(getNotifications).mockResolvedValue({
      data: {
        hasMore: false,
        notifications: mockUnreadNotifications,
      },
      success: true,
    });

    const { result } = renderHook(() => useNotifications(1, 20, true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getNotifications).toHaveBeenCalledWith(1, 20, true);
    expect(result.current.notifications).toEqual(mockUnreadNotifications);
  });

  it("デフォルトパラメータで正しく動作する", async () => {
    vi.mocked(getNotifications).mockResolvedValue({
      data: {
        hasMore: false,
        notifications: [],
      },
      success: true,
    });

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getNotifications).toHaveBeenCalledWith(1, 20, false);
  });
});
