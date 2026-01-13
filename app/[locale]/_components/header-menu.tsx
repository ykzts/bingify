"use client";

import { LayoutDashboard, LogOut, Settings, Shield, User } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

interface HeaderMenuProps {
  user: {
    avatar_url?: string | null;
    email?: string | null;
    full_name?: string | null;
    role?: string | null;
  } | null;
}

export function HeaderMenu({ user }: HeaderMenuProps) {
  const t = useTranslations("HeaderMenu");
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setOpen(false);
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
      setOpen(true);
    }
  };

  const isActivePath = (path: string) => {
    // ルートパスの特別処理
    if (path === "/") {
      return pathname === "/";
    }
    // 完全一致またはサブパスで始まる場合
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  if (!user) {
    // ログインページでは何も表示しない
    // 2つの空要素を返すことで、justify-betweenレイアウトを維持
    if (pathname === "/login") {
      return (
        <>
          <div />
          <div />
        </>
      );
    }

    // トップページからログインする場合はダッシュボードへリダイレクト
    const loginHref =
      pathname === "/" ? "/login?redirect=/dashboard" : "/login";

    return (
      <>
        <div />
        <Link
          className="rounded-md border border-gray-300 bg-white px-4 py-1.5 font-medium text-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
          href={loginHref}
        >
          {t("login")}
        </Link>
      </>
    );
  }

  return (
    <>
      {/* ナビゲーションリンク */}
      <nav className="flex items-center gap-2">
        <Link
          aria-current={isActivePath("/dashboard") ? "page" : undefined}
          className="flex items-center gap-2 rounded-md px-3 py-2 font-medium text-gray-700 text-sm transition-colors hover:bg-gray-100 aria-[current=page]:bg-purple-100 aria-[current=page]:text-purple-900 dark:text-gray-300 dark:aria-[current=page]:bg-purple-900/30 dark:aria-[current=page]:text-purple-100 dark:hover:bg-gray-800"
          href="/dashboard"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">{t("dashboard")}</span>
        </Link>

        {user.role === "admin" && (
          <Link
            aria-current={isActivePath("/admin") ? "page" : undefined}
            className="flex items-center gap-2 rounded-md px-3 py-2 font-medium text-gray-700 text-sm transition-colors hover:bg-gray-100 aria-[current=page]:bg-purple-100 aria-[current=page]:text-purple-900 dark:text-gray-300 dark:aria-[current=page]:bg-purple-900/30 dark:aria-[current=page]:text-purple-100 dark:hover:bg-gray-800"
            href="/admin"
          >
            <Shield className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">{t("admin")}</span>
          </Link>
        )}
      </nav>

      {/* 通知ベルとユーザーメニュー */}
      <div className="flex items-center gap-2">
        {/* 通知ベル */}
        <NotificationBell />

        {/* ユーザーメニュー */}
        <DropdownMenu onOpenChange={setOpen} open={open}>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={t("menu")}
              className="rounded-full"
              size="icon"
              type="button"
              variant="ghost"
            >
              {user.avatar_url ? (
                <Image
                  alt={user.full_name || user.email || t("userAvatar")}
                  className="rounded-full object-cover"
                  height={32}
                  src={user.avatar_url}
                  width={32}
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                  <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuPortal>
            <DropdownMenuContent
              align="end"
              className="z-[100] min-w-[240px]"
              sideOffset={8}
            >
              <div className="px-3 py-2">
                <p className="font-medium text-sm">
                  {user.full_name || user.email}
                </p>
                {user.full_name && user.email && (
                  <p className="text-muted-foreground text-sm">{user.email}</p>
                )}
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link
                  className="flex cursor-pointer items-center gap-2"
                  href="/settings/profile"
                >
                  <Settings className="h-4 w-4" />
                  {t("settings")}
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoggingOut}
                onSelect={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
      </div>
    </>
  );
}
