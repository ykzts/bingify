import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NotificationDropdown } from "../notification-dropdown";

// useNotificationsフックのモック
vi.mock("@/hooks/use-notifications", () => ({
  useNotifications: vi.fn(),
}));

// useInvalidateNotificationsフックのモック
vi.mock("@/hooks/use-invalidate-notifications", () => ({
  useInvalidateNotifications: vi.fn(() => vi.fn()),
}));

// markNotificationReadアクションのモック
vi.mock("@/lib/actions/notifications", () => ({
  markNotificationRead: vi.fn(),
}));

// next-intl/navigationのモック
vi.mock("@/i18n/navigation", () => ({
  useRouter: vi.fn(() => ({
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  })),
}));

import { useNotifications } from "@/hooks/use-notifications";
import { useRouter } from "@/i18n/navigation";
import { markNotificationRead } from "@/lib/actions/notifications";

/**
 * テスト用のラッパーコンポーネント
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const messages = {
    NotificationDropdown: {
      empty: "No notifications",
      viewAll: "View all",
    },
  };

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="en" messages={messages}>
          <DropdownMenu defaultOpen>
            <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
            {children}
          </DropdownMenu>
        </NextIntlClientProvider>
      </QueryClientProvider>
    );
  };
}

describe("NotificationDropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ローディング中はスケルトンが表示される", async () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: undefined,
      error: null,
      fetchError: undefined,
      hasMore: false,
      isLoading: true,
      notifications: [],
    });

    const { container } = render(<NotificationDropdown />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // スケルトンローディングが表示されることを確認
      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  it("通知が0件の場合、空状態が表示される", async () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: {
        hasMore: false,
        notifications: [],
      },
      error: null,
      fetchError: undefined,
      hasMore: false,
      isLoading: false,
      notifications: [],
    });

    render(<NotificationDropdown />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No notifications")).toBeInTheDocument();
    });
  });

  it("通知が表示される", async () => {
    const mockNotifications = [
      {
        content: "Test notification content",
        created_at: "2024-01-01T00:00:00Z",
        expires_at: "2024-02-01T00:00:00Z",
        id: "1",
        metadata: {},
        read: false,
        title: "Test Notification 1",
        type: "system_update",
        user_id: "user1",
      },
      {
        content: "Another notification",
        created_at: "2024-01-02T00:00:00Z",
        expires_at: "2024-02-02T00:00:00Z",
        id: "2",
        metadata: {},
        read: true,
        title: "Test Notification 2",
        type: "bingo_achieved",
        user_id: "user1",
      },
    ];

    vi.mocked(useNotifications).mockReturnValue({
      data: {
        hasMore: false,
        notifications: mockNotifications,
      },
      error: null,
      fetchError: undefined,
      hasMore: false,
      isLoading: false,
      notifications: mockNotifications,
    });

    render(<NotificationDropdown />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Test Notification 1")).toBeInTheDocument();
      expect(screen.getByText("Test Notification 2")).toBeInTheDocument();
    });
  });

  it("未読の通知にはドットが表示される", async () => {
    const mockNotifications = [
      {
        content: "Unread notification",
        created_at: "2024-01-01T00:00:00Z",
        expires_at: "2024-02-01T00:00:00Z",
        id: "1",
        metadata: {},
        read: false,
        title: "Unread Notification",
        type: "system_update",
        user_id: "user1",
      },
    ];

    vi.mocked(useNotifications).mockReturnValue({
      data: {
        hasMore: false,
        notifications: mockNotifications,
      },
      error: null,
      fetchError: undefined,
      hasMore: false,
      isLoading: false,
      notifications: mockNotifications,
    });

    const { container } = render(<NotificationDropdown />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // 未読ドットを探す（bg-purple-500のクラスを持つ要素）
      const unreadDot = container.querySelector(".bg-purple-500");
      expect(unreadDot).toBeInTheDocument();
    });
  });

  it('"すべて見る"リンクが表示される', async () => {
    const mockNotifications = [
      {
        content: "Test notification",
        created_at: "2024-01-01T00:00:00Z",
        expires_at: "2024-02-01T00:00:00Z",
        id: "1",
        metadata: {},
        read: false,
        title: "Test Notification",
        type: "system_update",
        user_id: "user1",
      },
    ];

    vi.mocked(useNotifications).mockReturnValue({
      data: {
        hasMore: false,
        notifications: mockNotifications,
      },
      error: null,
      fetchError: undefined,
      hasMore: false,
      isLoading: false,
      notifications: mockNotifications,
    });

    render(<NotificationDropdown />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("View all")).toBeInTheDocument();
    });
  });
});
