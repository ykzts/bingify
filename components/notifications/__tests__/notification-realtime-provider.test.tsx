import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationRealtimeProvider } from "../notification-realtime-provider";

// Supabase clientのモック
const mockUnsubscribe = vi.fn();
const mockOn = vi.fn(
  // biome-ignore lint/suspicious/noExplicitAny: テスト用のモック
  (_event?: any, _config?: any, _callback?: any) => ({
    subscribe: vi.fn(() => ({
      unsubscribe: mockUnsubscribe,
    })),
  })
);
const mockChannel = vi.fn(() => ({
  on: mockOn,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    channel: mockChannel,
  })),
}));

import { createClient } from "@/lib/supabase/client";

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
    invalidateQueries: vi.spyOn(queryClient, "invalidateQueries"),
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

describe("NotificationRealtimeProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("エラーなくレンダリングできる", () => {
    const { wrapper } = createWrapper();
    const { container } = render(
      <NotificationRealtimeProvider userId="user-123">
        <div data-testid="child">Test Child</div>
      </NotificationRealtimeProvider>,
      { wrapper }
    );

    expect(container).toHaveTextContent("Test Child");
  });

  it("childrenを透過的にレンダリングする", () => {
    const { wrapper } = createWrapper();
    const { getByTestId } = render(
      <NotificationRealtimeProvider userId="user-123">
        <div data-testid="child-transparent">Test Child</div>
      </NotificationRealtimeProvider>,
      { wrapper }
    );

    expect(getByTestId("child-transparent")).toBeInTheDocument();
    expect(getByTestId("child-transparent")).toHaveTextContent("Test Child");
  });

  it("Supabase Realtimeチャネルを作成する", () => {
    const { wrapper } = createWrapper();
    render(
      <NotificationRealtimeProvider userId="user-123">
        <div>Test</div>
      </NotificationRealtimeProvider>,
      { wrapper }
    );

    expect(createClient).toHaveBeenCalled();
    expect(mockChannel).toHaveBeenCalledWith("notifications");
  });

  it("正しいフィルターでpostgres_changesイベントをリッスンする", () => {
    const { wrapper } = createWrapper();
    const userId = "user-123";

    render(
      <NotificationRealtimeProvider userId={userId}>
        <div>Test</div>
      </NotificationRealtimeProvider>,
      { wrapper }
    );

    expect(mockOn).toHaveBeenCalledWith(
      "postgres_changes",
      {
        event: "*",
        filter: `user_id=eq.${userId}`,
        schema: "public",
        table: "notifications",
      },
      expect.any(Function)
    );
  });

  it("INSERTイベントでキャッシュを無効化する", async () => {
    const { wrapper, invalidateQueries } = createWrapper();

    // モックの設定: コールバック関数を取得して実行
    let callback: (() => void) | undefined;
    mockOn.mockImplementation(
      // biome-ignore lint/suspicious/noExplicitAny: テスト用のモック
      (_event: any, _config: any, cb: any) => {
        callback = cb;
        return {
          subscribe: vi.fn(() => ({
            unsubscribe: mockUnsubscribe,
          })),
        };
      }
    );

    render(
      <NotificationRealtimeProvider userId="user-123">
        <div>Test</div>
      </NotificationRealtimeProvider>,
      { wrapper }
    );

    // コールバックを実行してINSERTイベントをシミュレート
    expect(callback).toBeDefined();
    callback?.();

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["notifications"],
      });
    });
  });

  it("UPDATEイベントでキャッシュを無効化する", async () => {
    const { wrapper, invalidateQueries } = createWrapper();

    // モックの設定: コールバック関数を取得して実行
    let callback: (() => void) | undefined;
    mockOn.mockImplementation(
      // biome-ignore lint/suspicious/noExplicitAny: テスト用のモック
      (_event: any, _config: any, cb: any) => {
        callback = cb;
        return {
          subscribe: vi.fn(() => ({
            unsubscribe: mockUnsubscribe,
          })),
        };
      }
    );

    render(
      <NotificationRealtimeProvider userId="user-123">
        <div>Test</div>
      </NotificationRealtimeProvider>,
      { wrapper }
    );

    // コールバックを実行してUPDATEイベントをシミュレート
    expect(callback).toBeDefined();
    callback?.();

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["notifications"],
      });
    });
  });

  it("DELETEイベントでキャッシュを無効化する", async () => {
    const { wrapper, invalidateQueries } = createWrapper();

    // モックの設定: コールバック関数を取得して実行
    let callback: (() => void) | undefined;
    mockOn.mockImplementation(
      // biome-ignore lint/suspicious/noExplicitAny: テスト用のモック
      (_event: any, _config: any, cb: any) => {
        callback = cb;
        return {
          subscribe: vi.fn(() => ({
            unsubscribe: mockUnsubscribe,
          })),
        };
      }
    );

    render(
      <NotificationRealtimeProvider userId="user-123">
        <div>Test</div>
      </NotificationRealtimeProvider>,
      { wrapper }
    );

    // コールバックを実行してDELETEイベントをシミュレート
    expect(callback).toBeDefined();
    callback?.();

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["notifications"],
      });
    });
  });

  it("アンマウント時にサブスクリプションを解除する", () => {
    const { wrapper } = createWrapper();
    const { unmount } = render(
      <NotificationRealtimeProvider userId="user-123">
        <div>Test</div>
      </NotificationRealtimeProvider>,
      { wrapper }
    );

    expect(mockUnsubscribe).not.toHaveBeenCalled();

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("userIdが変更された場合、古いサブスクリプションを解除して新しいサブスクリプションを作成する", () => {
    const { wrapper } = createWrapper();
    const { rerender } = render(
      <NotificationRealtimeProvider userId="user-123">
        <div>Test</div>
      </NotificationRealtimeProvider>,
      { wrapper }
    );

    expect(mockChannel).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).not.toHaveBeenCalled();

    // userIdを変更
    rerender(
      <NotificationRealtimeProvider userId="user-456">
        <div>Test</div>
      </NotificationRealtimeProvider>
    );

    // 古いサブスクリプションが解除され、新しいサブスクリプションが作成される
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockChannel).toHaveBeenCalledTimes(2);
  });
});
