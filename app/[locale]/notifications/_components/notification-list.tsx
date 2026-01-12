"use client";

import { CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { NotificationItem } from "@/components/notifications/notification-item";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInvalidateNotifications } from "@/hooks/use-invalidate-notifications";
import { useNotifications } from "@/hooks/use-notifications";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";

interface NotificationListProps {
  locale: string;
}

/**
 * ローディングスケルトン
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...new Array(5)].map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: スケルトンローディング用
        <div className="flex gap-4 rounded-lg border p-4" key={i}>
          <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 空状態表示
 */
function EmptyState({ isUnreadTab }: { isUnreadTab: boolean }) {
  const t = useTranslations("Notifications");

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CheckCheck />
        </EmptyMedia>
        <EmptyContent>
          <EmptyTitle>
            {isUnreadTab ? t("emptyUnread") : t("emptyAll")}
          </EmptyTitle>
          <EmptyDescription>
            {isUnreadTab
              ? t("emptyUnreadDescription")
              : t("emptyAllDescription")}
          </EmptyDescription>
        </EmptyContent>
      </EmptyHeader>
    </Empty>
  );
}

/**
 * 通知一覧コンポーネント
 * タブでの切り替え、ページネーション、一括既読機能を提供
 */
export function NotificationList({ locale }: NotificationListProps) {
  const t = useTranslations("Notifications");
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const invalidateNotifications = useInvalidateNotifications();

  // activeTabに応じて未読のみを取得するかを決定
  const { notifications, hasMore, isLoading } = useNotifications(
    page,
    perPage,
    activeTab === "unread"
  );

  // タブ切り替え時にページをリセット
  const handleTabChange = (value: string) => {
    setActiveTab(value as "all" | "unread");
    setPage(1);
  };

  // 通知を既読にする
  const handleMarkRead = async (notificationId: string) => {
    const result = await markNotificationRead(notificationId);
    if (result.success) {
      invalidateNotifications();
    }
  };

  // すべての通知を既読にする
  const handleMarkAllRead = async () => {
    const result = await markAllNotificationsRead();
    if (result.success) {
      toast.success(t("markAllReadSuccess"));
      invalidateNotifications();
    } else {
      toast.error(result.error || t("errorGeneric"));
    }
  };

  // ページネーション
  const handlePreviousPage = () => {
    if (page > 1) {
      setPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const renderNotificationContent = (isUnreadTab: boolean) => {
    if (isLoading) {
      return <LoadingSkeleton />;
    }

    if (notifications.length === 0) {
      return <EmptyState isUnreadTab={isUnreadTab} />;
    }

    return (
      <>
        <div className="space-y-4">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              locale={locale}
              notification={notification}
              onMarkRead={handleMarkRead}
            />
          ))}
        </div>

        {(page > 1 || hasMore) && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  aria-disabled={page === 1}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                  onClick={handlePreviousPage}
                >
                  {t("previous")}
                </PaginationPrevious>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  aria-disabled={!hasMore}
                  className={hasMore ? "" : "pointer-events-none opacity-50"}
                  onClick={handleNextPage}
                >
                  {t("next")}
                </PaginationNext>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </>
    );
  };

  return (
    <Tabs onValueChange={handleTabChange} value={activeTab}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <TabsList>
          <TabsTrigger value="all">{t("allTab")}</TabsTrigger>
          <TabsTrigger value="unread">{t("unreadTab")}</TabsTrigger>
        </TabsList>

        <Button
          disabled={isLoading || notifications.length === 0}
          onClick={handleMarkAllRead}
          size="sm"
          variant="outline"
        >
          <CheckCheck />
          {t("markAllRead")}
        </Button>
      </div>

      <TabsContent className="space-y-6" value="all">
        {renderNotificationContent(false)}
      </TabsContent>

      <TabsContent className="space-y-6" value="unread">
        {renderNotificationContent(true)}
      </TabsContent>
    </Tabs>
  );
}
