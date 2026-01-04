"use client";

import { LayoutDashboard, LogOut, Settings, Shield, User } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffectEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

export function HeaderMenuContent({
  user,
}: {
  user: Pick<Tables<"profiles">, "avatar_url" | "email" | "full_name" | "role">;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("HeaderMenu");

  const returnToHome = useEffectEvent(() => {
    router.push("/");
    router.refresh();
  });

  const handleLogout = useCallback(() => {
    startTransition(async () => {
      const supabase = createClient();

      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error("Logout error:", error);

        return;
      }

      setOpen(false);
      returnToHome();
    });
  }, []);

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t("menu")}
          className="rounded-full"
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
          className="z-100 min-w-60"
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
              href="/dashboard"
            >
              <LayoutDashboard className="h-4 w-4" />
              {t("dashboard")}
            </Link>
          </DropdownMenuItem>

          {user.role === "admin" && (
            <DropdownMenuItem asChild>
              <Link
                className="flex cursor-pointer items-center gap-2"
                href="/admin"
              >
                <Shield className="h-4 w-4" />
                {t("admin")}
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link
              className="flex cursor-pointer items-center gap-2"
              href="/settings/account"
            >
              <Settings className="h-4 w-4" />
              {t("settings")}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            onSelect={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
