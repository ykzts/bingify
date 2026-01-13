import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Notification } from "@/lib/types/notification";
import { NotificationItem } from "../notification-item";

/**
 * テスト用のラッパーコンポーネント
 */
function createWrapper() {
  const messages = {
    NotificationItem: {
      delete: "Delete",
      markAsRead: "Mark as read",
    },
  };

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale="en" messages={messages}>
        {children}
      </NextIntlClientProvider>
    );
  };
}

/**
 * モック通知データを生成
 */
function createMockNotification(
  overrides?: Partial<Notification>
): Notification {
  return {
    content: "Test notification content",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    id: "test-notification-id",
    metadata: {},
    read: false,
    title: "Test Notification",
    type: "system_update",
    user_id: "test-user-id",
    ...overrides,
  };
}

describe("NotificationItem", () => {
  describe("表示内容", () => {
    it("通知のタイトルが表示される", () => {
      const notification = createMockNotification({
        title: "Important Update",
      });

      render(
        <NotificationItem locale="en" notification={notification} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText("Important Update")).toBeInTheDocument();
    });

    it("通知のコンテンツがexpandedモードで表示される", () => {
      const notification = createMockNotification({
        content: "This is the notification content",
      });

      render(
        <NotificationItem
          locale="en"
          notification={notification}
          variant="expanded"
        />,
        { wrapper: createWrapper() }
      );

      expect(
        screen.getByText("This is the notification content")
      ).toBeInTheDocument();
    });

    it("コンテンツがcompactモードで非表示になる", () => {
      const notification = createMockNotification({
        content: "This is the notification content",
      });

      render(
        <NotificationItem
          locale="en"
          notification={notification}
          variant="compact"
        />,
        { wrapper: createWrapper() }
      );

      expect(
        screen.queryByText("This is the notification content")
      ).not.toBeInTheDocument();
    });

    it("相対時刻が表示される", () => {
      const notification = createMockNotification();

      const { container } = render(
        <NotificationItem locale="en" notification={notification} />,
        { wrapper: createWrapper() }
      );

      const timeElement = container.querySelector(".text-xs.text-gray-400");
      expect(timeElement).toBeInTheDocument();
      expect(timeElement?.textContent).toBeTruthy();
    });
  });

  describe("既読/未読の視覚的区別", () => {
    it("未読通知には太字のタイトルと紫色のドットが表示される", () => {
      const notification = createMockNotification({
        read: false,
      });

      const { container } = render(
        <NotificationItem locale="en" notification={notification} />,
        { wrapper: createWrapper() }
      );

      const title = screen.getByText(notification.title);
      expect(title).toHaveClass("font-semibold");

      const dot = container.querySelector(".bg-purple-500");
      expect(dot).toBeInTheDocument();
    });

    it("既読通知には通常のタイトルでドットが非表示", () => {
      const notification = createMockNotification({
        read: true,
      });

      const { container } = render(
        <NotificationItem locale="en" notification={notification} />,
        { wrapper: createWrapper() }
      );

      const title = screen.getByText(notification.title);
      expect(title).not.toHaveClass("font-semibold");

      const dot = container.querySelector(".bg-purple-500");
      expect(dot).not.toBeInTheDocument();
    });

    it("未読通知には紫色の背景が適用される", () => {
      const notification = createMockNotification({
        read: false,
      });

      const { container } = render(
        <NotificationItem locale="en" notification={notification} />,
        { wrapper: createWrapper() }
      );

      const itemContainer = container.querySelector(".bg-purple-50\\/50");
      expect(itemContainer).toBeInTheDocument();
    });
  });

  describe("アクションボタン", () => {
    it("削除ボタンが表示される", () => {
      const notification = createMockNotification();
      const onDelete = vi.fn();

      render(
        <NotificationItem
          locale="en"
          notification={notification}
          onDelete={onDelete}
        />,
        { wrapper: createWrapper() }
      );

      const deleteButton = screen.getByRole("button", {
        name: /delete/i,
      });
      expect(deleteButton).toBeInTheDocument();
    });

    it("削除ボタンをクリックするとonDeleteが呼ばれる", () => {
      const notification = createMockNotification();
      const onDelete = vi.fn();

      render(
        <NotificationItem
          locale="en"
          notification={notification}
          onDelete={onDelete}
        />,
        { wrapper: createWrapper() }
      );

      const deleteButton = screen.getByRole("button", {
        name: /delete/i,
      });
      fireEvent.click(deleteButton);

      expect(onDelete).toHaveBeenCalledWith(notification.id);
    });
  });

  describe("クリック動作", () => {
    it("linkUrlがある場合、Linkコンポーネントでレンダリングされる", () => {
      const notification = createMockNotification({
        metadata: { action_url: "https://example.com/notification" },
      });

      const { container } = render(
        <NotificationItem locale="en" notification={notification} />,
        { wrapper: createWrapper() }
      );

      const link = container.querySelector(
        'a[href="https://example.com/notification"]'
      );
      expect(link).toBeInTheDocument();
    });
  });
});
