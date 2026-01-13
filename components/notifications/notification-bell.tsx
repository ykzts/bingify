"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUnreadCount } from "@/hooks/use-unread-count";
import { NotificationDropdown } from "./notification-dropdown";

/**
 * 通知ベルアイコンコンポーネント
 * ヘッダーに表示される通知アイコンで、未読数をバッジで表示します
 */
export function NotificationBell() {
  const t = useTranslations("NotificationBell");
  const { count } = useUnreadCount();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t("notifications")}
          className="relative"
          size="icon"
          type="button"
          variant="ghost"
        >
          <Bell className="size-4" />
          {count > 0 && (
            <Badge
              className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs"
              variant="destructive"
            >
              {count > 99 ? "99+" : count}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuPortal>
        <NotificationDropdown onOpenChange={setOpen} />
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
