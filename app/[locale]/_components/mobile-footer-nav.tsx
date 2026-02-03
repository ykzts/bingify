"use client";

import {
  Bell,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  User,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUnreadCount } from "@/hooks/use-unread-count";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

interface MobileFooterNavProps {
  user: {
    avatar_url?: string | null;
    email?: string | null;
    full_name?: string | null;
    role?: string | null;
  } | null;
}

export function MobileFooterNav({ user }: MobileFooterNavProps) {
  const t = useTranslations("HeaderMenu");
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [open, setOpen] = useState(false);
  const { count } = useUnreadCount();

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
    if (path === "/") {
      return pathname === "/";
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  if (!user) {
    return null;
  }

  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 border-border border-t bg-background/95 backdrop-blur-sm md:hidden">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link
          aria-current={isActivePath("/dashboard") ? "page" : undefined}
          aria-label={t("dashboard")}
          className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md py-2 text-muted-foreground text-xs transition-colors hover:bg-accent aria-[current=page]:text-primary"
          href="/dashboard"
        >
          <div className="flex h-5 w-5 items-center justify-center">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <span>{t("dashboard")}</span>
        </Link>

        {user.role === "admin" && (
          <Link
            aria-current={isActivePath("/admin") ? "page" : undefined}
            aria-label={t("admin")}
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md py-2 text-muted-foreground text-xs transition-colors hover:bg-accent aria-[current=page]:text-primary"
            href="/admin"
          >
            <div className="flex h-5 w-5 items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <span>{t("admin")}</span>
          </Link>
        )}

        <Link
          aria-current={isActivePath("/notifications") ? "page" : undefined}
          aria-label={t("notifications")}
          className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md py-2 text-muted-foreground text-xs transition-colors hover:bg-accent aria-[current=page]:text-primary"
          href="/notifications"
        >
          <div className="relative flex h-5 w-5 items-center justify-center">
            <Bell className="h-5 w-5" />
            {count > 0 && (
              <Badge
                className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]"
                variant="destructive"
              >
                {count > 99 ? "99+" : count}
              </Badge>
            )}
          </div>
          <span>{t("notifications")}</span>
        </Link>

        <DropdownMenu onOpenChange={setOpen} open={open}>
          <DropdownMenuTrigger asChild>
            <button
              aria-label={t("menu")}
              className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md py-2 text-muted-foreground text-xs transition-colors hover:bg-accent"
              type="button"
            >
              <div className="flex h-5 w-5 items-center justify-center">
                {user.avatar_url ? (
                  <Image
                    alt={user.full_name || user.email || t("userAvatar")}
                    className="rounded-full object-cover"
                    height={20}
                    src={user.avatar_url}
                    width={20}
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </div>
              <span>{t("menu")}</span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuPortal>
            <DropdownMenuContent
              align="end"
              className="z-[100] min-w-[240px]"
              side="top"
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
    </nav>
  );
}
