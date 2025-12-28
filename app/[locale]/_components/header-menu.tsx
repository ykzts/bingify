"use client";

import {
  Content as DropdownMenuContent,
  Item as DropdownMenuItem,
  Portal as DropdownMenuPortal,
  Root as DropdownMenuRoot,
  Separator as DropdownMenuSeparator,
  Sub as DropdownMenuSub,
  SubContent as DropdownMenuSubContent,
  SubTrigger as DropdownMenuSubTrigger,
  Trigger as DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { Globe, LogOut, Settings, User } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
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
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
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
        <DropdownMenuRoot open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              aria-label={tLang("label")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white transition hover:bg-gray-50"
              type="button"
            >
              <Globe className="h-4 w-4 text-gray-600" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuPortal>
            <DropdownMenuContent
              align="end"
              className="z-[100] min-w-[200px] rounded-md border border-gray-200 bg-white p-1 shadow-lg"
              sideOffset={8}
            >
              {routing.locales.map((loc) => (
                <DropdownMenuItem
                  key={loc}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors hover:bg-gray-100",
                    locale === loc && "bg-gray-50 font-medium",
                  )}
                  disabled={isPending}
                  onSelect={() => handleLocaleChange(loc)}
                >
                  {localeNames[loc] || loc.toUpperCase()}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>

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
    <DropdownMenuRoot open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("menu")}
          className="flex items-center gap-2 rounded-full transition hover:opacity-80"
          type="button"
        >
          {user.avatar_url ? (
            <Image
              alt={user.full_name || user.email || "User"}
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
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuPortal>
        <DropdownMenuContent
          align="end"
          className="z-[100] min-w-[240px] rounded-md border border-gray-200 bg-white p-1 shadow-lg"
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

          <DropdownMenuSeparator className="my-1 h-px bg-gray-200" />

          <DropdownMenuItem asChild>
            <Link
              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors hover:bg-gray-100"
              href="/settings/account"
            >
              <Settings className="h-4 w-4" />
              {t("settings")}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors hover:bg-gray-100 data-[state=open]:bg-gray-100">
              <Globe className="h-4 w-4" />
              {t("language")}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                className="z-[100] min-w-[180px] rounded-md border border-gray-200 bg-white p-1 shadow-lg"
                sideOffset={8}
              >
                {routing.locales.map((loc) => (
                  <DropdownMenuItem
                    key={loc}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors hover:bg-gray-100",
                      locale === loc && "bg-gray-50 font-medium",
                    )}
                    disabled={isPending}
                    onSelect={() => handleLocaleChange(loc)}
                  >
                    {localeNames[loc] || loc.toUpperCase()}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSeparator className="my-1 h-px bg-gray-200" />

          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoggingOut}
            onSelect={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
  );
}
