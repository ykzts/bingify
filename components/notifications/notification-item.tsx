"use client";

import { Bell } from "lucide-react";
import type { Notification } from "@/lib/types/notification";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/utils/date-format";

interface NotificationItemProps {
  locale: string;
  notification: Notification;
  onMarkRead?: (id: string) => void;
}

/**
 * 通知アイテムコンポーネント
 * 個別の通知を表示します
 */
export function NotificationItem({
  locale,
  notification,
  onMarkRead,
}: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.read && onMarkRead) {
      onMarkRead(notification.id);
    }
  };

  return (
    <button
      className={cn(
        "flex w-full gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-gray-50",
        !notification.read && "border-purple-200 bg-purple-50/50"
      )}
      onClick={handleClick}
      type="button"
    >
      <div className="flex-shrink-0">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            notification.read ? "bg-gray-100" : "bg-purple-100"
          )}
        >
          <Bell
            className={cn(
              "h-5 w-5",
              notification.read ? "text-gray-500" : "text-purple-600"
            )}
          />
        </div>
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm",
              notification.read
                ? "text-gray-900"
                : "font-semibold text-gray-900"
            )}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-purple-500" />
          )}
        </div>

        {notification.content && (
          <p className="text-gray-600 text-sm">{notification.content}</p>
        )}

        <p className="text-gray-400 text-xs">
          {formatDateShort(notification.created_at || "", locale)}
        </p>
      </div>
    </button>
  );
}
