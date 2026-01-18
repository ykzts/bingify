"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface Props {
  locale: string;
}

export function AdminNav({ locale }: Props) {
  const t = useTranslations("Admin");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navItems = [
    { href: `/${locale}/admin`, label: t("navOverview") },
    { href: `/${locale}/admin/announcements`, label: t("navAnnouncements") },
    { href: `/${locale}/admin/spaces`, label: t("navSpaces") },
    { href: `/${locale}/admin/users`, label: t("navUsers") },
    {
      href: `/${locale}/admin/auth-providers`,
      label: t("navAuthProviders"),
    },
    { href: `/${locale}/admin/auth-hooks`, label: t("navAuthHooks") },
    { href: `/${locale}/admin/general`, label: t("navGeneral") },
    {
      href: `/${locale}/admin/resource-limits`,
      label: t("navResourceLimits"),
    },
    { href: `/${locale}/admin/gatekeeper`, label: t("navGatekeeper") },
  ];

  const isActive = (href: string) => {
    if (href === `/${locale}/admin`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* モバイルメニュー (md未満) */}
      <div className="mb-8 border-gray-200 border-b md:hidden">
        <Sheet onOpenChange={setOpen} open={open}>
          <SheetTrigger asChild>
            <Button className="mb-4" size="icon" variant="outline">
              <Menu className="size-5" />
              <span className="sr-only">{t("mobileMenuOpen")}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>{t("dashboardTitle")}</SheetTitle>
            </SheetHeader>
            <nav className="mt-6">
              <ul className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <SheetClose asChild>
                      <Link
                        className={cn(
                          "block rounded-xs px-4 py-2 transition-colors hover:bg-gray-100",
                          isActive(item.href) &&
                            "bg-purple-50 font-semibold text-purple-700"
                        )}
                        href={item.href}
                        onClick={() => setOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  </li>
                ))}
              </ul>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* デスクトップナビゲーション (md以上) */}
      <nav className="mb-8 hidden border-gray-200 border-b md:block">
        <ul className="flex gap-6">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                className={cn(
                  "inline-block border-transparent border-b-2 pb-4 transition-colors hover:border-purple-500",
                  isActive(item.href) && "border-purple-600 font-semibold"
                )}
                href={item.href}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
