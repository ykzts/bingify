import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "../notification-bell";

// useUnreadCountフックのモック
vi.mock("@/hooks/use-unread-count", () => ({
  useUnreadCount: vi.fn(),
}));

import { useUnreadCount } from "@/hooks/use-unread-count";

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
    NotificationBell: {
      comingSoon: "Notification list coming soon",
      notifications: "Notifications",
    },
  };

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="en" messages={messages}>
          {children}
        </NextIntlClientProvider>
      </QueryClientProvider>
    );
  };
}

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ベルアイコンが表示される", () => {
    vi.mocked(useUnreadCount).mockReturnValue({
      count: 0,
      error: null,
      isLoading: false,
    });

    render(<NotificationBell />, { wrapper: createWrapper() });

    const button = screen.getByRole("button", { name: "Notifications" });
    expect(button).toBeInTheDocument();
  });

  it("未読数が0の場合、バッジが表示されない", () => {
    vi.mocked(useUnreadCount).mockReturnValue({
      count: 0,
      error: null,
      isLoading: false,
    });

    const { container } = render(<NotificationBell />, {
      wrapper: createWrapper(),
    });

    // Badge要素が存在しないことを確認
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge).not.toBeInTheDocument();
  });

  it("未読数が1以上の場合、バッジが表示される", async () => {
    vi.mocked(useUnreadCount).mockReturnValue({
      count: 5,
      error: null,
      isLoading: false,
    });

    const { container } = render(<NotificationBell />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("5");
    });
  });

  it("未読数が99を超える場合、99+と表示される", async () => {
    vi.mocked(useUnreadCount).mockReturnValue({
      count: 150,
      error: null,
      isLoading: false,
    });

    const { container } = render(<NotificationBell />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("99+");
    });
  });
});
