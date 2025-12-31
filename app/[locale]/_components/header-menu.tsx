"use client";

import { Globe, LogOut, Settings, User } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface HeaderMenuProps {
  user: {
    avatar_url?: string | null;
    email?: string | null;
    full_name?: string | null;
  } | null;
}

const localeNames: Record<string, string> = {
  en: "English",
  ja: "日本語",
};

export function HeaderMenu({ user }: HeaderMenuProps) {
  const t = useTranslations("HeaderMenu");
  const tLang = useTranslations("LanguageSwitcher");
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isPending, startTransition] = useTransition();
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

  const handleLocaleChange = (newLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
      setOpen(false);
    });
  };

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <DropdownMenu onOpenChange={setOpen} open={open}>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={tLang("label")}
              size="icon"
              type="button"
              variant="outline"
            >
              <Globe className="h-4 w-4 text-gray-600" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuPortal>
            <DropdownMenuContent
              align="end"
              className="z-[100] min-w-[200px]"
              sideOffset={8}
            >
              {routing.locales.map((loc) => (
                <DropdownMenuItem
                  className={cn(locale === loc && "bg-gray-50 font-medium")}
                  disabled={isPending}
                  key={loc}
                  onSelect={() => handleLocaleChange(loc)}
                >
                  {localeNames[loc] || loc.toUpperCase()}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>

        <Link
          className="rounded-md border border-gray-300 bg-white px-4 py-1.5 font-medium text-sm transition hover:bg-gray-50"
          href="/login"
        >
          {t("login")}
        </Link>
      </div>
    );
  }

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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
              <User className="h-4 w-4 text-gray-600" />
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
              <p className="text-gray-500 text-sm">{user.email}</p>
            )}
          </div>

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

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Globe className="h-4 w-4" />
              {t("language")}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                className="z-[100] min-w-[180px]"
                sideOffset={8}
              >
                {routing.locales.map((loc) => (
                  <DropdownMenuItem
                    className={cn(locale === loc && "bg-gray-50 font-medium")}
                    disabled={isPending}
                    key={loc}
                    onSelect={() => handleLocaleChange(loc)}
                  >
                    {localeNames[loc] || loc.toUpperCase()}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

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
  );
}
