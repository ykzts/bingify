"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CheckCircle,
  Info,
  Megaphone,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useInvalidateNotifications } from "@/hooks/use-invalidate-notifications";
import { useNotifications } from "@/hooks/use-notifications";
import { useRouter } from "@/i18n/navigation";
import { markNotificationRead } from "@/lib/actions/notifications";
import type { Notification } from "@/lib/types/notification";
import { NotificationType } from "@/lib/types/notification";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/utils/date-format";

/**
 * 通知タイプに応じたアイコンを返す
 */
function getNotificationIcon(type: string): LucideIcon {
  switch (type) {
    case NotificationType.ANNOUNCEMENT_PUBLISHED:
      return Megaphone;
    case NotificationType.BINGO_ACHIEVED:
      return CheckCircle;
    case NotificationType.ROLE_CHANGED:
      return ShieldAlert;
    case NotificationType.SPACE_INVITATION:
      return UserPlus;
    case NotificationType.SPACE_UPDATED:
    case NotificationType.SPACE_CLOSED:
      return Info;
    case NotificationType.SYSTEM_UPDATE:
      return Info;
    default:
      return Bell;
  }
}

/**
 * ローディングスケルトン
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {[...new Array(5)].map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: スケルトンローディング用
        <div className="flex gap-3 p-2" key={i}>
          <div className="size-8 animate-pulse rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-2 w-1/2 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 空状態表示
 */
function EmptyState() {
  const t = useTranslations("NotificationDropdown");

  return (
    <div className="p-6 text-center">
      <Bell className="mx-auto mb-2 size-8 text-gray-400" />
      <p className="text-gray-500 text-sm">{t("empty")}</p>
    </div>
  );
}

interface NotificationDropdownItemProps {
  locale: string;
  notification: Notification;
  onClose: () => void;
}

/**
 * 通知ドロップダウンアイテム
 */
function NotificationDropdownItem({
  locale,
  notification,
  onClose,
}: NotificationDropdownItemProps) {
  const router = useRouter();
  const invalidateNotifications = useInvalidateNotifications();

  const Icon = getNotificationIcon(notification.type);

  const handleClick = async () => {
    // 未読の場合は既読にする
    if (!notification.read) {
      await markNotificationRead(notification.id);
      invalidateNotifications();
    }

    // ドロップダウンを閉じる
    onClose();

    // リンクURLがある場合は遷移
    const metadata = notification.metadata as { action_url?: string };
    if (metadata?.action_url) {
      router.push(metadata.action_url);
    }
  };

  return (
    <DropdownMenuItem
      className="flex cursor-pointer items-start gap-3 p-3"
      onClick={handleClick}
    >
      <div className="flex-shrink-0 pt-0.5">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-full",
            notification.read ? "bg-gray-100" : "bg-purple-100"
          )}
        >
          <Icon
            className={cn(
              "size-4",
              notification.read ? "text-gray-500" : "text-purple-600"
            )}
          />
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm leading-tight",
              notification.read
                ? "text-gray-900"
                : "font-semibold text-gray-900"
            )}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <span className="mt-1 size-2 flex-shrink-0 rounded-full bg-purple-500" />
          )}
        </div>

        <p className="text-gray-400 text-xs">
          {formatDateShort(notification.created_at, locale)}
        </p>
      </div>
    </DropdownMenuItem>
  );
}

interface NotificationDropdownProps {
  onOpenChange?: (open: boolean) => void;
}

/**
 * 通知ドロップダウンコンテンツ
 * 最新5件の通知をプレビュー表示します
 */
export function NotificationDropdown({
  onOpenChange,
}: NotificationDropdownProps) {
  const t = useTranslations("NotificationDropdown");
  const locale = useLocale();
  const router = useRouter();

  // 最新5件を取得
  const { notifications, isLoading } = useNotifications(1, 5, false);

  const handleClose = () => {
    onOpenChange?.(false);
  };

  const handleViewAll = () => {
    handleClose();
    router.push("/notifications");
  };

  return (
    <DropdownMenuContent align="end" className="w-80">
      {isLoading && <LoadingSkeleton />}

      {!isLoading && notifications.length === 0 && <EmptyState />}

      {!isLoading && notifications.length > 0 && (
        <>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((notification) => (
              <NotificationDropdownItem
                key={notification.id}
                locale={locale}
                notification={notification}
                onClose={handleClose}
              />
            ))}
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="cursor-pointer justify-center font-medium text-purple-600 text-sm"
            onClick={handleViewAll}
          >
            {t("viewAll")}
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenuContent>
  );
}
