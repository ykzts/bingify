import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUnreadCount } from "../use-unread-count";

// lib/actions/notificationsのモック
vi.mock("@/lib/actions/notifications", () => ({
  getUnreadCount: vi.fn(),
}));

import { getUnreadCount } from "@/lib/actions/notifications";

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

describe("useUnreadCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未読通知数を正常に取得できる", async () => {
    vi.mocked(getUnreadCount).mockResolvedValue({
      data: {
        count: 5,
      },
      success: true,
    });

    const { result } = renderHook(() => useUnreadCount(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.count).toBe(5);
    expect(result.current.error).toBeNull();
    expect(getUnreadCount).toHaveBeenCalled();
  });

  it("未読通知数が0の場合も正常に動作する", async () => {
    vi.mocked(getUnreadCount).mockResolvedValue({
      data: {
        count: 0,
      },
      success: true,
    });

    const { result } = renderHook(() => useUnreadCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.count).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it("エラーが発生した場合はエラー状態を返す", async () => {
    const errorMessage = "未読通知数の取得に失敗しました";

    vi.mocked(getUnreadCount).mockResolvedValue({
      error: errorMessage,
      success: false,
    });

    const { result } = renderHook(() => useUnreadCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.fetchError).toBe(errorMessage);
    expect(result.current.count).toBe(0);
  });

  it("認証エラーが発生した場合もエラー状態を返す", async () => {
    const errorMessage = "認証が必要です";

    vi.mocked(getUnreadCount).mockResolvedValue({
      error: errorMessage,
      success: false,
    });

    const { result } = renderHook(() => useUnreadCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.fetchError).toBe(errorMessage);
  });
});
