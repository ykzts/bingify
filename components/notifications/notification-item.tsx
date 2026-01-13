"use client";

import {
  Bell,
  Check,
  Mail,
  Megaphone,
  ShieldAlert,
  Trash2,
  Trophy,
  UserCog,
  X,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Notification } from "@/lib/types/notification";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/date-format";

interface NotificationItemProps {
  locale: string;
  notification: Notification;
  onDelete?: (id: string) => void;
  onMarkRead?: (id: string) => void;
  variant?: "compact" | "expanded";
}

/**
 * 通知タイプに応じたアイコンを取得
 */
function getNotificationIcon(type: string) {
  switch (type) {
    case "space_invitation":
      return Mail;
    case "space_updated":
      return Bell;
    case "bingo_achieved":
      return Trophy;
    case "announcement_published":
      return Megaphone;
    case "system_update":
      return ShieldAlert;
    case "role_changed":
      return UserCog;
    case "space_closed":
      return Trash2;
    default:
      return Bell;
  }
}

/**
 * 通知アイテムコンポーネント
 * 個別の通知を表示します
 */
export function NotificationItem({
  locale,
  notification,
  onDelete,
  onMarkRead,
  variant = "expanded",
}: NotificationItemProps) {
  const Icon = getNotificationIcon(notification.type);
  const metadata = notification.metadata as { action_url?: string } | null;
  const linkUrl = metadata?.action_url;

  const handleMarkRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onMarkRead) {
      onMarkRead(notification.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(notification.id);
    }
  };

  const content = (
    <>
      <div className="flex-shrink-0">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            notification.read ? "bg-gray-100" : "bg-purple-100"
          )}
        >
          <Icon
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

        {notification.content && variant === "expanded" && (
          <p className="line-clamp-2 text-gray-600 text-sm">
            {notification.content}
          </p>
        )}

        <p className="text-gray-400 text-xs">
          {formatRelativeTime(notification.created_at || "", locale)}
        </p>
      </div>

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!notification.read && onMarkRead && (
          <Button
            onClick={handleMarkRead}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Check className="h-4 w-4" />
            <span className="sr-only">Mark as read</span>
          </Button>
        )}
        {onDelete && (
          <Button
            onClick={handleDelete}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </div>
    </>
  );

  if (linkUrl) {
    return (
      <Link
        className={cn(
          "group relative flex w-full gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-gray-50",
          !notification.read && "border-purple-200 bg-purple-50/50"
        )}
        href={linkUrl}
        onClick={() => {
          if (!notification.read && onMarkRead) {
            onMarkRead(notification.id);
          }
        }}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex w-full gap-4 rounded-lg border p-4 text-left transition-colors",
        !notification.read && "border-purple-200 bg-purple-50/50"
      )}
    >
      {content}
    </div>
  );
}
